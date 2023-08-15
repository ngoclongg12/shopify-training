export const QUERY_PRODUCTS_FIRST = `query ($first: Int!, $cursor: String) {
  products(first: $first, after: $cursor) {
    edges {
      cursor
    }
    nodes {
      id
      title
      status
      description
      vendor
      createdAt
      totalInventory
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
  }
}`;

export const QUERY_PRODUCTS_LAST = `query ($last: Int!, $cursor: String) {
    products(last: $last, before: $cursor) {
        edges {
            cursor
        }
        nodes {
            id
            title
            status
            description
            vendor
            createdAt
            totalInventory
        }
        pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
        }
    }
}`

export const QUERY_VARIANTS_UPDATE = `mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
        productVariant {
            id
            price
            title
        }
        userErrors {
            field
            message
        }
    }
}`;

export const QUERY_PRODUCT_UPDATE_BY_ID = `mutation productUpdate ($input: ProductInput!) {
        productUpdate (input: $input) {
          product {
            title
            description
            id
            images(first: 1) {
              edges{
                node{ url }
              }
            }
            metafield(namespace: "extra", key: "extra") {
              id
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`;