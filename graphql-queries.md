# GraphQL Queries for Product Discounts

This file contains example GraphQL queries to fetch discounted products from your Strapi instance.

## Base URL
```
http://localhost:1337/graphql
```

---

## Query 1: Get All Product Discounts

Fetch all product-discount pairs with full details including store information.

```graphql
query GetAllProductDiscounts {
  productDiscounts {
    data {
      id
      attributes {
        productName
        productDutchieId
        productDescription
        productImageUrl
        productBrand
        discountName
        discountBrand
        discountImageUrl
        discountStartTimestamp
        discountEndTimestamp
        discountIsActive
        discountDutchieId
        storeId
        storeName
        storeLocation
        createdAt
        updatedAt
      }
    }
  }
}
```

---

## Query 2: Get Only Active Discounts

Filter for only currently active discounts with store information.

```graphql
query GetActiveProductDiscounts {
  productDiscounts(filters: { discountIsActive: { eq: true } }) {
    data {
      id
      attributes {
        productName
        productDutchieId
        productImageUrl
        productBrand
        discountName
        discountStartTimestamp
        discountEndTimestamp
        discountIsActive
        storeId
        storeName
        storeLocation
      }
    }
  }
}
```

---

## Query 3: Get Discounts by Brand

Filter products by a specific brand.

```graphql
query GetProductDiscountsByBrand($brand: String!) {
  productDiscounts(filters: { productBrand: { eq: $brand } }) {
    data {
      id
      attributes {
        productName
        productDutchieId
        productImageUrl
        productBrand
        discountName
        discountStartTimestamp
        discountEndTimestamp
        discountIsActive
      }
    }
  }
}
```

**Variables:**
```json
{
  "brand": "Your Brand Name"
}
```

---

## Query 4: Get Products with Active Discounts Ending Soon

Find active discounts ending within the next 7 days.

```graphql
query GetDiscountsEndingSoon($endDate: DateTime!) {
  productDiscounts(
    filters: {
      and: [
        { discountIsActive: { eq: true } }
        { discountEndTimestamp: { lte: $endDate } }
      ]
    }
    sort: ["discountEndTimestamp:asc"]
  ) {
    data {
      id
      attributes {
        productName
        productImageUrl
        productBrand
        discountName
        discountEndTimestamp
      }
    }
  }
}
```

**Variables:**
```json
{
  "endDate": "2024-12-31T23:59:59.999Z"
}
```

---

## Query 5: Get a Specific Product's Discounts

Fetch all discounts for a specific product using its Dutchie ID.

```graphql
query GetProductDiscounts($productDutchieId: String!) {
  productDiscounts(filters: { productDutchieId: { eq: $productDutchieId } }) {
    data {
      id
      attributes {
        productName
        productDutchieId
        productImageUrl
        discountName
        discountBrand
        discountImageUrl
        discountStartTimestamp
        discountEndTimestamp
        discountIsActive
      }
    }
  }
}
```

**Variables:**
```json
{
  "productDutchieId": "product-123"
}
```

---

## Query 6: Get Paginated Active Discounts

Fetch active discounts with pagination (useful for large datasets).

```graphql
query GetActiveDiscountsPaginated($page: Int!, $pageSize: Int!) {
  productDiscounts(
    filters: { discountIsActive: { eq: true } }
    pagination: { page: $page, pageSize: $pageSize }
  ) {
    data {
      id
      attributes {
        productName
        productImageUrl
        productBrand
        discountName
        discountEndTimestamp
      }
    }
    meta {
      pagination {
        page
        pageSize
        pageCount
        total
      }
    }
  }
}
```

**Variables:**
```json
{
  "page": 1,
  "pageSize": 10
}
```

---

## Query 7: Count Active Discounts

Get a count of all active product discounts.

```graphql
query CountActiveDiscounts {
  productDiscounts(filters: { discountIsActive: { eq: true } }) {
    meta {
      pagination {
        total
      }
    }
  }
}
```

---

## Query 8: Search Products by Name

Search for products containing a specific text in their name.

```graphql
query SearchProductsByName($searchTerm: String!) {
  productDiscounts(
    filters: {
      and: [
        { productName: { containsi: $searchTerm } }
        { discountIsActive: { eq: true } }
      ]
    }
  ) {
    data {
      id
      attributes {
        productName
        productDutchieId
        productImageUrl
        productBrand
        discountName
        discountEndTimestamp
      }
    }
  }
}
```

**Variables:**
```json
{
  "searchTerm": "flower"
}
```

---

## Query 9: Get Active Discounts by Store ID

Filter discounts for a specific store location.

```graphql
query GetDiscountsByStoreId($storeId: String!) {
  productDiscounts(
    filters: {
      and: [
        { storeId: { eq: $storeId } }
        { discountIsActive: { eq: true } }
      ]
    }
  ) {
    data {
      id
      attributes {
        productName
        productImageUrl
        productBrand
        discountName
        discountStartTimestamp
        discountEndTimestamp
        storeId
        storeName
        storeLocation
      }
    }
  }
}
```

**Variables:**
```json
{
  "storeId": "1"
}
```

---

## Query 10: Get Active Discounts by Store Name

Filter discounts for a specific store by name.

```graphql
query GetDiscountsByStoreName($storeName: String!) {
  productDiscounts(
    filters: {
      and: [
        { storeName: { eq: $storeName } }
        { discountIsActive: { eq: true } }
      ]
    }
  ) {
    data {
      id
      attributes {
        productName
        productImageUrl
        productBrand
        discountName
        discountStartTimestamp
        discountEndTimestamp
        storeId
        storeName
        storeLocation
      }
    }
  }
}
```

**Variables:**
```json
{
  "storeName": "Downtown Location"
}
```

---

## Query 11: Get All Stores with Active Discounts

Get a unique list of stores that have active discounts (useful for store selector).

```graphql
query GetStoresWithDiscounts {
  productDiscounts(filters: { discountIsActive: { eq: true } }) {
    data {
      id
      attributes {
        storeId
        storeName
        storeLocation
      }
    }
  }
}
```

**Note:** You'll need to deduplicate the results on the frontend to get unique stores.

---

## Query 12: Get Discounts for Multiple Stores

Filter discounts across multiple store locations.

```graphql
query GetDiscountsByMultipleStores($storeIds: [String]!) {
  productDiscounts(
    filters: {
      and: [
        { storeId: { in: $storeIds } }
        { discountIsActive: { eq: true } }
      ]
    }
  ) {
    data {
      id
      attributes {
        productName
        productImageUrl
        productBrand
        discountName
        discountStartTimestamp
        discountEndTimestamp
        storeId
        storeName
        storeLocation
      }
    }
  }
}
```

**Variables:**
```json
{
  "storeIds": ["1", "2", "3"]
}
```

---

## Query 13: Count Active Discounts by Store

Get count of active discounts grouped by store (requires frontend aggregation).

```graphql
query CountDiscountsByStore {
  productDiscounts(filters: { discountIsActive: { eq: true } }) {
    data {
      attributes {
        storeId
        storeName
      }
    }
    meta {
      pagination {
        total
      }
    }
  }
}
```

---

## Using GraphQL Queries in Your Website

### Using Fetch API

```javascript
async function getActiveDiscounts() {
  const query = `
    query {
      productDiscounts(filters: { discountIsActive: { eq: true } }) {
        data {
          id
          attributes {
            productName
            productImageUrl
            discountName
            discountEndTimestamp
          }
        }
      }
    }
  `;

  const response = await fetch('http://localhost:1337/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const { data } = await response.json();
  return data.productDiscounts.data;
}
```

### Using Apollo Client (React)

```javascript
import { useQuery, gql } from '@apollo/client';

const GET_ACTIVE_DISCOUNTS = gql`
  query GetActiveDiscounts {
    productDiscounts(filters: { discountIsActive: { eq: true } }) {
      data {
        id
        attributes {
          productName
          productImageUrl
          discountName
          discountEndTimestamp
        }
      }
    }
  }
`;

function DiscountedProducts() {
  const { loading, error, data } = useQuery(GET_ACTIVE_DISCOUNTS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.productDiscounts.data.map(({ id, attributes }) => (
        <div key={id}>
          <h3>{attributes.productName}</h3>
          <p>{attributes.discountName}</p>
          <img src={attributes.productImageUrl} alt={attributes.productName} />
        </div>
      ))}
    </div>
  );
}
```

### Using graphql-request

```javascript
import { request, gql } from 'graphql-request';

const query = gql`
  query GetActiveDiscounts {
    productDiscounts(filters: { discountIsActive: { eq: true } }) {
      data {
        id
        attributes {
          productName
          productImageUrl
          discountName
          discountEndTimestamp
        }
      }
    }
  }
`;

const data = await request('http://localhost:1337/graphql', query);
console.log(data);
```

---

## Testing Queries

You can test these queries directly in the Strapi GraphQL Playground:

1. Start your Strapi server
2. Navigate to `http://localhost:1337/graphql`
3. Copy and paste any query above
4. Add variables if needed in the Variables panel
5. Click the Play button to execute

---

## Notes

- Replace `http://localhost:1337` with your actual Strapi URL
- Make sure the GraphQL plugin is installed and enabled in Strapi
- Ensure proper permissions are set for public access or provide authentication token
- All timestamp fields are in ISO 8601 format
- Use `containsi` for case-insensitive string searches
