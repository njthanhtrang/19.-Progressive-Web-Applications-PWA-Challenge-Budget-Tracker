// var to hold db connection
let db;
// event listener, est connection to IndexedDB, set to V1
// indexedDB is a global variable, part of browser's window obj
// .open() takes 2 params, name of DB want to create/connect to and version
const request = indexedDB.open("budget_tracker", 1);

// event emits if DB version changes
request.onupgradeneeded = function (event) {
  // save a reference to DB
  const db = event.target.result;
  // create obj store (table), set to have autoincrement primary key of sorts
  db.createObjectStore("new_transaction", { autoIncrement: true });
};

// upon successful connection to DB
request.onsuccess = function(event) {
  // when db is successfully created with obj store, save ref to db in global var
  db = event.target.result;

  // check if app is online, if yes run uploadTransaction() to send all local db data to api
  if (navigator.onLine) {
    //   check if we're online every time app opens and upload remnant transaction data
    uploadTransaction();
  }
};

request.onerror = function (event) {
  // log error
  console.log(event.target.errorCode);
};

// if we attempt to submit a new transaction and there's no internet
function saveRecord(record) {
  // open new transaction(temporary connection) with DB with read and write permissions
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // access obj store for `new_transaction`
  const transactionObjectStore = transaction.objectStore("new_transaction");

  // add record to store with add method
  transactionObjectStore.add(record);
}

// open new transaction, read data
function uploadTransaction() {
  // open transaction on db
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // access obj store for `new_transaction`
  const transactionObjectStore = transaction.objectStore("new_transaction");

  // get all records from store and set to a var
  const getAll = transactionObjectStore.getAll();

  // upon successful .getAll()
  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, send to api server
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        // getAll.result is an array of all data we retrieved from new_transaction obj store
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        }
      })
        .then((response) => response.json())
        .then(() => {
          // open one more transaction
          const transaction = db.transaction(["new_transaction"], "readwrite");
          // access new_transaction obj store
          const transactionObjectStore = transaction.objectStore("new_transaction");
          // clear all items in store
          transactionObjectStore.clear();

          alert("All saved transactions have been submitted!");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", uploadTransaction);
