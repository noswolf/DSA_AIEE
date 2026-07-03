[x] ทำ interactive guide สำหรับเนื้อหา oop โดยมีรายละเอียดดังนี้

Guide OOP ไม่ต้องจัดเต็มแบบลงลึกนะ

Scope เนื้อหาคือ รู้จัก class, ใช้ method / attribute เป็นก็ ok

Scope ของ code ที่อาจารย์จะสอน คือ D:\work\DSA_AIEE\Week4\Tutorial_Week4_student.ipynb

ตัวอย่าง Code ของ Class ที่เกี่ยวกับ data structure
```python
class ArrayList:

def _init__(self): self.data = np.empty(1, dtype=object) self.size = 0

def append(self, value): # Your code here

def _getitem_(self, idx): """Implements `x = self[idx]`"""

assert isinstance(idx, int), 'Index must be an integer'

if idx < 0:

idx += self.size

if idx < 0 or idx >= self.size:

raise IndexError('list index out of range')

return self.data[idx]

def_setitem_(self, idx, value): """Implements `self[idx] = x^"""

assert isinstance(idx, int), 'Index must be an integer'

if idx < 0:

idx += self.size

if idx < 0 or idx >= self.size:

raise IndexError('list index out of range')

self.data[idx] = value

def _delitem_(self, idx):

"""Implements `del self[idx]`"""

assert isinstance(idx, int), 'Index must be an integer'

if idx < 0:

idx += self.size

if idx < 0 or idx >= self.size:

raise IndexError('list index out of range')

for i in range(idx, self.size-1): self.data[i] = self.data[i+1]

self.size -= 1

def _len_(self):

"""Implements `len(self)`"""

return self.size

def _repr_(self):

"""Supports inspection""" return '[' + ','.join(repr(self.data[i]) for i in range(self.size)) + ']'

```

```python
class HashTable2:

def

_init__(self, n_buckets):

self._buckets = [None] * n_buckets

self._size = 0

def

_setitem_(self, key, val):

bidx = hash(key) % len(self._buckets)

self._buckets [bidx] = [key, val]

def _getitem_(self, key):

bidx = hash(key) % len(self._buckets)

if self._buckets [bidx] is not None:

return self._buckets [bidx] [1]

else:

raise KeyError(key)

def

_contains_(self, key):

try:

= self[key]

return True

except:

return False

def _len_(self):

return self._size

def_hash (self, key):

## Add your code here

pass

def insertData(self, key, val):

hashkey = self._hash(key)

no_collision = 0

for in range(len(self._buckets)):

if self._buckets [hashkey] is None:

self._buckets [hashkey] = [key, val]

self._size += 1

print("Number of collisions: ", no_collision)

print("Insert", key, "at index", hashkey)

return hashkey, no_collision

hashkey = (hashkey+1) % len(self._buckets)

no_collision += 1

# Rehash the key

print("Number of collisions: ", no_collision)

raise KeyError("HashTable is full or key cannot be inserted")

def searchData(self, key):

no_collision = 0

## Add your code here

pass
```

```python
Define a Singly Linked List class and DataNode class

class SinglyLinkedListBase:

def _init__(self):

self._count = 0

self._head = None

class DataNode:

def

__init__(self, name, next):

self._name = name

self._next = next
```

```python
# Define a Singly Linked List class and DataNode class

class SinglyLinkedListBase:

def _init__(self):

self._count = 0

self._head = None

class DataNode:

def

__init__(self, name, next):

self._name = name

self._next = next
```

```python
class SinglyLinkedList (SinglyLinkedListBase):

# Extend from SinglyLinkedListBase

#self._count 0

Inherited from SinglyLinkedListBase class

#self._head = None

Inherited from SinglyLinkedListBase class

def traverse(self):

current = None

if self._head is None:

print("This is an empty list.")

## Add your code here

pass

def insertFront (self, data):

pNew = DataNode(data, None)

## Add your code here

pass

def insertLast(self, data):

pNew = DataNode(data, None)

## Add your code here

pass

def insertBefore(self, node_name, data):

pNew = DataNode(data, None)

## Add your code here

pass

def delete(self, data):

## Add your code here

pass

def access(self, index):

# eg., list1.access(2)

current = self._head

count = 0

while current is not None:

if count == index:

return current._name

count += 1

current = current_next

return None

def getSize(self):

#eg., list1.getSize()

return self._count
```

มี Class Inherit/Extend บ้าง

ปัญหาคือ มือใหม่ เขาก็ยัง งง อยู่ดี เช่น instance/class namespace ต่างกันยังไง แล้ว init กับ super มันอะไรยังไง

ถ้ามี guide ที่ค่อยๆอธิบาย หรือมีภาพประกอบ น่าจะดีขึ้น