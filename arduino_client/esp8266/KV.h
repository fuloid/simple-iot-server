// What's this? 
// A simple key-value storage using EEPROM for persistent data
// This library help store data easily, by removing headaches of using address instead of a normal KV interface

#ifndef KV_H
#define KV_H

#include <Arduino.h>

class KVStore {
public:
  KVStore(int maxKeyCount = 10, int maxKeyLen = 16, int maxValueLen = 64);
  void begin();

  bool set(const String &key, const String &value);
  String get(const String &key);
  bool remove(const String &key);
  void clear();

private:
  int _maxKeyCount;
  int _maxKeyLen;
  int _maxValueLen;
  int _entrySize;

  int findKeyIndex(const String &key);
  int getAddressForIndex(int index);
};

extern KVStore KV;

#endif