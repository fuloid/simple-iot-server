#include "KV.h"
#include <EEPROM.h>

KVStore KV;

KVStore::KVStore(int maxKeyCount, int maxKeyLen, int maxValueLen)
  : _maxKeyCount(maxKeyCount), _maxKeyLen(maxKeyLen), _maxValueLen(maxValueLen) {
  _entrySize = _maxKeyLen + _maxValueLen;
}

void KVStore::begin() {
  EEPROM.begin(_maxKeyCount * _entrySize);
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
  if (key.length() >= _maxKeyLen || value.length() >= _maxValueLen) return false;

  int index = findKeyIndex(key);
  if (index == -1) {
    // Find first empty slot
    for (int i = 0; i < _maxKeyCount; i++) {
      int addr = getAddressForIndex(i);
      if (EEPROM.read(addr) == 0xFF || EEPROM.read(addr) == '\0') {
        index = i;
        break;
      }
    }
    if (index == -1) return false;
  }

  int addr = getAddressForIndex(index);

  // Write key
  for (int i = 0; i < _maxKeyLen; i++) {
    EEPROM.write(addr + i, (i < key.length()) ? key[i] : '\0');
  }

  // Write value
  for (int i = 0; i < _maxValueLen; i++) {
    EEPROM.write(addr + _maxKeyLen + i, (i < value.length()) ? value[i] : '\0');
  }

  EEPROM.commit();
  return true;
}

String KVStore::get(const String &key) {
  int index = findKeyIndex(key);
  if (index == -1) return "";

  int addr = getAddressForIndex(index) + _maxKeyLen;

  String value;
  for (int i = 0; i < _maxValueLen; i++) {
    char c = EEPROM.read(addr + i);
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
    EEPROM.write(addr + i, '\0');
  }

  EEPROM.commit();
  return true;
}

void KVStore::clear() {
  for (int i = 0; i < _maxKeyCount * _entrySize; i++) {
    EEPROM.write(i, '\0');
  }
  EEPROM.commit();
}