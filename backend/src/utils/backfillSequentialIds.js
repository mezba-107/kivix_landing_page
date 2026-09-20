const Customer = require("../models/Customer");
const Order = require("../models/Order");

async function backfillSequentialIds() {
  const customers = await Customer.find({ customerNumber: { $exists: false } }).sort({
    createdAt: 1,
  });
  for (const c of customers) {
    await c.save(); // pre-save hook assigns the next customerNumber
  }
  if (customers.length) {
    console.log(`Backfilled customerNumber for ${customers.length} existing customer(s)`);
  }

  const orders = await Order.find({ orderNumber: { $exists: false } }).sort({ date: 1 });
  for (const o of orders) {
    await o.save(); // pre-save hook assigns the next orderNumber
  }
  if (orders.length) {
    console.log(`Backfilled orderNumber for ${orders.length} existing order(s)`);
  }
}

module.exports = backfillSequentialIds;
