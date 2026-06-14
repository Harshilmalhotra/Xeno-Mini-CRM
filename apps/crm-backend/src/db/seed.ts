// apps/crm-backend/src/db/seed.ts
import { pool } from './index';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const CUSTOMERS = [
  { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '+919810001001', city: 'Delhi' },
  { name: 'Rahul Mehta', email: 'rahul.mehta@gmail.com', phone: '+919810001002', city: 'Mumbai' },
  { name: 'Ananya Krishnan', email: 'ananya.k@gmail.com', phone: '+919810001003', city: 'Bangalore' },
  { name: 'Vikram Nair', email: 'vikram.nair@gmail.com', phone: '+919810001004', city: 'Chennai' },
  { name: 'Sneha Patel', email: 'sneha.p@gmail.com', phone: '+919810001005', city: 'Ahmedabad' },
  { name: 'Arjun Bose', email: 'arjun.bose@gmail.com', phone: '+919810001006', city: 'Kolkata' },
  { name: 'Meera Iyer', email: 'meera.iyer@gmail.com', phone: '+919810001007', city: 'Pune' },
  { name: 'Karan Malhotra', email: 'karan.m@gmail.com', phone: '+919810001008', city: 'Delhi' },
  { name: 'Divya Rao', email: 'divya.rao@gmail.com', phone: '+919810001009', city: 'Hyderabad' },
  { name: 'Siddharth Joshi', email: 'sid.joshi@gmail.com', phone: '+919810001010', city: 'Mumbai' },
  { name: 'Kavya Menon', email: 'kavya.menon@gmail.com', phone: '+919810001011', city: 'Bangalore' },
  { name: 'Rohan Gupta', email: 'rohan.g@gmail.com', phone: '+919810001012', city: 'Delhi' },
  { name: 'Nisha Verma', email: 'nisha.v@gmail.com', phone: '+919810001013', city: 'Jaipur' },
  { name: 'Aditya Kumar', email: 'aditya.k@gmail.com', phone: '+919810001014', city: 'Bangalore' },
  { name: 'Pooja Singh', email: 'pooja.s@gmail.com', phone: '+919810001015', city: 'Mumbai' },
  { name: 'Nikhil Reddy', email: 'nikhil.r@gmail.com', phone: '+919810001016', city: 'Hyderabad' },
  { name: 'Lakshmi Nambiar', email: 'lakshmi.n@gmail.com', phone: '+919810001017', city: 'Kochi' },
  { name: 'Tarun Saxena', email: 'tarun.s@gmail.com', phone: '+919810001018', city: 'Lucknow' },
  { name: 'Ishaan Chaudhary', email: 'ishaan.c@gmail.com', phone: '+919810001019', city: 'Chandigarh' },
  { name: 'Riya Kapoor', email: 'riya.k@gmail.com', phone: '+919810001020', city: 'Delhi' },
  { name: 'Manish Tiwari', email: 'manish.t@gmail.com', phone: '+919810001021', city: 'Bhopal' },
  { name: 'Shreya Agarwal', email: 'shreya.a@gmail.com', phone: '+919810001022', city: 'Delhi' },
  { name: 'Varun Pillai', email: 'varun.p@gmail.com', phone: '+919810001023', city: 'Bangalore' },
  { name: 'Deepika Shetty', email: 'deepika.s@gmail.com', phone: '+919810001024', city: 'Mumbai' },
  { name: 'Aakash Dubey', email: 'aakash.d@gmail.com', phone: '+919810001025', city: 'Varanasi' },
  { name: 'Tanvi Kulkarni', email: 'tanvi.k@gmail.com', phone: '+919810001026', city: 'Pune' },
  { name: 'Harsh Bajaj', email: 'harsh.b@gmail.com', phone: '+919810001027', city: 'Indore' },
  { name: 'Simran Dhillon', email: 'simran.d@gmail.com', phone: '+919810001028', city: 'Amritsar' },
  { name: 'Aman Choudhury', email: 'aman.c@gmail.com', phone: '+919810001029', city: 'Kolkata' },
  { name: 'Nidhi Bhatt', email: 'nidhi.b@gmail.com', phone: '+919810001030', city: 'Ahmedabad' },
  { name: 'Rajesh Naik', email: 'rajesh.n@gmail.com', phone: '+919810001031', city: 'Goa' },
  { name: 'Sunita Pillai', email: 'sunita.p@gmail.com', phone: '+919810001032', city: 'Kochi' },
  { name: 'Kunal Trivedi', email: 'kunal.t@gmail.com', phone: '+919810001033', city: 'Surat' },
  { name: 'Asha Desai', email: 'asha.d@gmail.com', phone: '+919810001034', city: 'Mumbai' },
  { name: 'Vikash Pandey', email: 'vikash.p@gmail.com', phone: '+919810001035', city: 'Patna' },
  { name: 'Preeti Mathur', email: 'preeti.m@gmail.com', phone: '+919810001036', city: 'Jaipur' },
  { name: 'Shubham Rastogi', email: 'shubham.r@gmail.com', phone: '+919810001037', city: 'Agra' },
  { name: 'Ankita Dey', email: 'ankita.d@gmail.com', phone: '+919810001038', city: 'Kolkata' },
  { name: 'Saurabh Jain', email: 'saurabh.j@gmail.com', phone: '+919810001039', city: 'Bangalore' },
  { name: 'Madhuri Patil', email: 'madhuri.p@gmail.com', phone: '+919810001040', city: 'Pune' },
  { name: 'Abhishek Roy', email: 'abhishek.r@gmail.com', phone: '+919810001041', city: 'Delhi' },
  { name: 'Chandni Shah', email: 'chandni.s@gmail.com', phone: '+919810001042', city: 'Ahmedabad' },
  { name: 'Girish Nair', email: 'girish.n@gmail.com', phone: '+919810001043', city: 'Kochi' },
  { name: 'Pallavi Joshi', email: 'pallavi.j@gmail.com', phone: '+919810001044', city: 'Nagpur' },
  { name: 'Rohit Singhania', email: 'rohit.s@gmail.com', phone: '+919810001045', city: 'Mumbai' },
  { name: 'Usha Krishnaswamy', email: 'usha.k@gmail.com', phone: '+919810001046', city: 'Chennai' },
  { name: 'Devendra Yadav', email: 'devendra.y@gmail.com', phone: '+919810001047', city: 'Kanpur' },
  { name: 'Ayesha Khan', email: 'ayesha.k@gmail.com', phone: '+919810001048', city: 'Hyderabad' },
  { name: 'Tejas Patwardhan', email: 'tejas.p@gmail.com', phone: '+919810001049', city: 'Pune' },
  { name: 'Manya Chopra', email: 'manya.c@gmail.com', phone: '+919810001050', city: 'Delhi' },
  { name: 'Ankit Bhargava', email: 'ankit.b@gmail.com', phone: '+919810001051', city: 'Bhopal' },
  { name: 'Swati Ghosh', email: 'swati.g@gmail.com', phone: '+919810001052', city: 'Kolkata' },
  { name: 'Naveen Menon', email: 'naveen.m@gmail.com', phone: '+919810001053', city: 'Bangalore' },
  { name: 'Kritika Arora', email: 'kritika.a@gmail.com', phone: '+919810001054', city: 'Delhi' },
  { name: 'Yash Saxena', email: 'yash.s@gmail.com', phone: '+919810001055', city: 'Lucknow' },
  { name: 'Divyanka Tripathi', email: 'divyanka.t@gmail.com', phone: '+919810001056', city: 'Bhopal' },
  { name: 'Rishab Hegde', email: 'rishab.h@gmail.com', phone: '+919810001057', city: 'Bangalore' },
  { name: 'Payal Srivastava', email: 'payal.s@gmail.com', phone: '+919810001058', city: 'Allahabad' },
  { name: 'Sumit Bansal', email: 'sumit.b@gmail.com', phone: '+919810001059', city: 'Chandigarh' },
  { name: 'Namrata Deshpande', email: 'namrata.d@gmail.com', phone: '+919810001060', city: 'Pune' },
];

const PRODUCTS = [
  { name: 'Oat Latte', category: 'drink', minAmount: 320, maxAmount: 320 },
  { name: 'Espresso Shot', category: 'drink', minAmount: 180, maxAmount: 180 },
  { name: 'Cold Brew', category: 'drink', minAmount: 280, maxAmount: 280 },
  { name: 'Cappuccino', category: 'drink', minAmount: 260, maxAmount: 260 },
  { name: 'Pour Over', category: 'drink', minAmount: 350, maxAmount: 350 },
  { name: 'Matcha Latte', category: 'drink', minAmount: 340, maxAmount: 340 },
  { name: 'Flat White', category: 'drink', minAmount: 290, maxAmount: 290 },
  { name: 'Seasonal Blend Bag', category: 'retail', minAmount: 750, maxAmount: 1200 },
  { name: 'Subscription Box', category: 'subscription', minAmount: 1800, maxAmount: 2400 },
  { name: 'Gift Card', category: 'retail', minAmount: 500, maxAmount: 1000 },
];

// Assign last-order days based on churn bucket
function getLastOrderDaysAgo(index: number): number {
  if (index < 15) return Math.floor(Math.random() * 7) + 1;
  if (index < 35) return Math.floor(Math.random() * 22) + 8;
  if (index < 50) return Math.floor(Math.random() * 29) + 31;
  return Math.floor(Math.random() * 59) + 61;
}

async function seed() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(`
    DROP TABLE IF EXISTS customer_twins, processed_event_ids, campaign_debriefs, campaign_messages, campaigns, segments, orders, customers CASCADE;
  `);
  await pool.query(schema);

  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    const cid = uuidv4();
    await pool.query(
      `INSERT INTO customers (id, name, email, phone, city) VALUES ($1,$2,$3,$4,$5)`,
      [cid, c.name, c.email, c.phone, c.city]
    );

    const orderCount = Math.floor(Math.random() * 8) + 1;
    const lastOrderDays = getLastOrderDaysAgo(i);

    for (let o = 0; o < orderCount; o++) {
      const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      const daysAgo = o === 0 ? lastOrderDays : lastOrderDays + Math.floor(Math.random() * 60);
      const orderedAt = new Date(Date.now() - daysAgo * 86400000 - o * 86400000 * 3);
      const amount = product.minAmount + Math.random() * (product.maxAmount - product.minAmount);

      await pool.query(
        `INSERT INTO orders (id, customer_id, product_name, category, amount, ordered_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), cid, product.name, product.category, Math.round(amount), orderedAt]
      );
    }
  }

  const { rows } = await pool.query('SELECT COUNT(*) FROM customers');
  const { rows: orderRows } = await pool.query('SELECT COUNT(*) FROM orders');
  console.log(`✓ Seeded ${rows[0].count} customers, ${orderRows[0].count} orders`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
