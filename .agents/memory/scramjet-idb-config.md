---
name: Scramjet IDB config codec
description: How Scramjet stores codec in IndexedDB — must be strings, not functions
---

When storing Scramjet config in IndexedDB, the codec.encode and codec.decode fields must be string representations of the functions, not actual functions. IDB uses structured clone which cannot serialize functions.

  codec: {
    encode: "v=>v?encodeURIComponent(v):v",
    decode: "v=>v?decodeURIComponent(v):v",
  }

The SW reconstructs them via s(`return ${config.codec.encode}`)().

**Why:** DataCloneError thrown at IDBObjectStore.put() if functions are included.

**How to apply:** Any time Scramjet config is written to IDB (indexedDB.open("$scramjet",1)), use string-serialized codec.
