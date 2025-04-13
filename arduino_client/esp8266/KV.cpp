#include "KV.h"
#include <EEPROM.h>

#define EEPROM_SIGNATURE 0xDEADBEEF  // Some unique signature or checksum

KVStore KV;

KVStore::KVStore(int maxKeyCount, int maxKeyLen, int maxValueLen)
  : _maxKeyCount(maxKeyCount), _maxKeyLen(maxKeyLen), _maxValueLen(maxValueLen) {
  _entrySize = _maxKeyLen + _maxValueLen + sizeof(uint16_t) + sizeof(uint32_t);  // Adjust entry size for both key and value length and signature
}

void KVStore::begin() {
  EEPROM.begin(_maxKeyCount * _entrySize);

  Serial.println("Checking for EEPROM data integrity...");

  // Check if the EEPROM is completely empty
  bool isEEPROMEmpty = true;
  for (int i = 0; i < _maxKeyCount * _entrySize; i++) {
    if (EEPROM.read(i) != 0xFF) {
      isEEPROMEmpty = false;
      break;
    }
  }

  if (!isEEPROMEmpty) {
    // Check if EEPROM contains a valid session token and signature
    bool valid = false;

    for (int i = 0; i < _maxKeyCount; i++) {
      int addr = getAddressForIndex(i);

      // Check if the signature is at the expected location
      uint32_t storedSignature = 0;
      storedSignature |= EEPROM.read(addr + _maxKeyLen + _maxValueLen + 0);
      storedSignature |= EEPROM.read(addr + _maxKeyLen + _maxValueLen + 1) << 8;
      storedSignature |= EEPROM.read(addr + _maxKeyLen + _maxValueLen + 2) << 16;
      storedSignature |= EEPROM.read(addr + _maxKeyLen + _maxValueLen + 3) << 24;

      if (storedSignature == EEPROM_SIGNATURE) {
        valid = true;
      }
    }

    if (!valid) {
      Serial.println("EEPROM corruption detected. Clearing EEPROM...");
      clear();  // Clear the EEPROM
      return;
    }
  }

  Serial.println("EEPROM data integrity validated.");
}

int KVStore::getAddressForIndex(int index) {
  return index * _entrySize;
}

int KVStore::findKeyIndex(const String &key) {
  for (int i = 0; i < _maxKeyCount; i++) {
    int addr = getAddressForIndex(i);
    String storedKey;
    for (int j = 0; j < _maxKeyLen; j++) {
      char c = EEPROM.read(addr + j);
      if (c == '\0') break;
      storedKey += c;
    }
    if (storedKey == key) {
      return i;
    }
  }
  return -1;
}

bool KVStore::set(const String &key, const String &value) {
  if (key.length() > _maxKeyLen || value.length() > _maxValueLen) return false;  // Ensure within limits

  int index = findKeyIndex(key);  // Check if the key already exists
  if (index == -1) {
    // If the key doesn't exist, find the first available slot
    for (int i = 0; i < _maxKeyCount; i++) {
      int addr = getAddressForIndex(i);
      if (EEPROM.read(addr) == 0xFF || EEPROM.read(addr) == '\0') {
        index = i;
        break;
      }
    }
    if (index == -1) {
      Serial.println("Warning: No space left available to write " + key + " on EEPROM!");
      return false;
    }
  }

  int addr = getAddressForIndex(index);

  // Write the key
  for (int i = 0; i < _maxKeyLen; i++) {
    EEPROM.write(addr + i, (i < key.length()) ? key[i] : '\0');
  }

  // Store the value length (2 bytes)
  uint16_t valueLength = value.length();
  EEPROM.write(addr + _maxKeyLen, valueLength & 0xFF);             // Store low byte of value length
  EEPROM.write(addr + _maxKeyLen + 1, (valueLength >> 8) & 0xFF);  // Store high byte of value length

  // Write the value
  for (int i = 0; i < valueLength; i++) {
    EEPROM.write(addr + _maxKeyLen + 2 + i, value[i]);
  }

  // Write checksum/signature at the end of the data
  EEPROM.write(addr + _maxKeyLen + 2 + valueLength + 0, EEPROM_SIGNATURE & 0xFF);
  EEPROM.write(addr + _maxKeyLen + 2 + valueLength + 1, (EEPROM_SIGNATURE >> 8) & 0xFF);
  EEPROM.write(addr + _maxKeyLen + 2 + valueLength + 2, (EEPROM_SIGNATURE >> 16) & 0xFF);
  EEPROM.write(addr + _maxKeyLen + 2 + valueLength + 3, (EEPROM_SIGNATURE >> 24) & 0xFF);

  EEPROM.commit();
  return true;
}

String KVStore::get(const String &key) {
  int index = findKeyIndex(key);  // Find key index
  if (index == -1) return "";     // Return empty string if not found

  int addr = getAddressForIndex(index) + _maxKeyLen;

  // Retrieve the value length
  uint16_t valueLength = EEPROM.read(addr) | (EEPROM.read(addr + 1) << 8);

  // Read the value
  String value;
  for (int i = 0; i < valueLength; i++) {
    char c = EEPROM.read(addr + 2 + i);
    if (c == '\0') break;
    value += c;
  }

  return value;
}

bool KVStore::remove(const String &key) {
  int index = findKeyIndex(key);
  if (index == -1) return false;

  int addr = getAddressForIndex(index);
  for (int i = 0; i < _entrySize; i++) {
    EEPROM.write(addr + i, '\0');  // Clear the entry
  }

  EEPROM.commit();
  return true;
}

void KVStore::clear() {
  for (int i = 0; i < _maxKeyCount * _entrySize; i++) {
    EEPROM.write(i, '\0');
  }
  EEPROM.commit();
  Serial.println("EEPROM cleared.");
}