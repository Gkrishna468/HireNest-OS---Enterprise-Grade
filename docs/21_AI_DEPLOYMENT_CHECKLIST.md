# AI Deployment Validation Checklist

Before any AI logic or standard application code is merged to production, the AI Agent must validate the following 5 critical database performance rules. These issues often remain hidden during local development with 10 fake users but cause catastrophic failures in production at 2 AM with real traffic.

## 1. N+1 Queries - One join beats a hundred round trips
* **Problem**: Fetching a list of documents, then looping through them to fetch related documents one-by-one.
* **Firestore Context**: Firestore does not support native SQL joins, but N+1 queries still happen if you fetch an array of IDs and run `.get()` in a `for` loop.
* **Solution**: Use `IN` queries (up to 30 items) or denormalize data so the initial read contains what is needed. If you must fetch multiple, use `Promise.all()` to fetch them concurrently, rather than awaiting sequentially.

## 2. No Pagination - Don't return 50k rows for one page load
* **Problem**: Using `.get()` on an entire collection (e.g., `db.collection('users').get()`).
* **Firestore Context**: A `get()` without `limit()` downloads every single document in the collection. With 50,000 records, this will crash Node.js with an Out of Memory error and result in massive bandwidth egress costs.
* **Solution**: Always use `.limit()`, `.startAfter()`, or cursor-based pagination. If you need a total count, use Firestore's native `count()` aggregation (`db.collection('x').count().get()`) instead of fetching documents to measure array length.

## 3. Missing Indexes - Don't make the DB scan every row to find one
* **Problem**: Performing complex queries with multiple `where` and `orderBy` clauses without composite indexes.
* **Firestore Context**: Firestore will throw a "Missing Index" error link in development, but sometimes simple queries scan too many documents.
* **Solution**: Rely on `firestore.indexes.json` for composite indexes. Ensure the front-end uses query bounds that match these indexes.

## 4. No Connection Pool - Cap it before you run out of connections
* **Problem**: Exhausting the database connection limit.
* **Firestore Context**: The Firebase Admin SDK handles connection pooling under the hood via gRPC. However, initializing the app repeatedly or failing to manage memory streams properly can exhaust resources.
* **Solution**: Keep the `admin.initializeApp()` singleton pattern intact. Ensure that long-running listeners (`onSnapshot`) are properly detached on the client-side.

## 5. SELECT * - Stop fetching columns you'll never use
* **Problem**: Over-fetching large datasets just to use one field (like an ID or a status).
* **Firestore Context**: Standard Firestore SDKs fetch the entire document payload. If a candidate document contains a 5MB base64 resume and you only need their name, you're wasting bandwidth.
* **Solution**: When using the Admin SDK, use the `.select('name', 'status')` method to only retrieve the required fields. For client SDKs, split large data (like raw resume text) into subcollections so it isn't fetched on every list view.

---
**Enforcement**: Any endpoint in `src/api-lib/handlers/` or `src/lib/` making database calls MUST be audited against this checklist before deployment.
