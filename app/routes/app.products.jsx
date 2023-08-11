import { useEffect } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  LegacyCard,
  IndexTable,
  useIndexResourceState,
  Pagination,
  Card,
  Badge,
  Link,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `query ($numProducts: Int!, $cursor: String) {
      products(first: $numProducts, after: $cursor) {
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
          endCursor
        }
      }
    }`,
    {
      variables: {
        numProducts: 10,
        cursor: null,
      },
    }
  );

  const responseJson = await response.json();

  return responseJson.data.products.nodes;
};

export default function Products() {
  const products = useLoaderData();

  const resourceName = {
    singular: "order",
    plural: "orders",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  const generateStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "DRAFT":
        return "critical";
      default:
        return "new";
    }
  };

  const toDate = (date) => {
    const dateFormatted = new Date(date);
    dateFormatted.setTime(dateFormatted.getTime());

    return dateFormatted.toLocaleDateString("en-CA", {
      year: "numeric",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const rowMarkup = products.map(
    (
      { id, title, description, totalInventory, vendor, status, createdAt },
      index
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Link
            url={`/app/product/${id.replace(
              "gid://shopify/Product/",
              ""
            )}`}
          >
            {id.replace("gid://shopify/Product/", "")}
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>{title}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge status={generateStatusBadge(status)}>{status}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{totalInventory}</IndexTable.Cell>
        <IndexTable.Cell>{description}</IndexTable.Cell>
        <IndexTable.Cell>{toDate(createdAt)}</IndexTable.Cell>
        <IndexTable.Cell>{vendor}</IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <Card>
      <ui-title-bar title="All products" />
      <Page fullWidth>
        <LegacyCard>
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            selectable={false}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "Id" },
              { title: "Price" },
              { title: "Status" },
              { title: "Quantity" },
              { title: "Description" },
              { title: "Created At" },
              { title: "Service Provider" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </LegacyCard>
        <div style={{ marginTop: "1rem" }}>
          <Pagination
            hasPrevious
            onPrevious={() => {
              console.log("Previous");
            }}
            hasNext
            onNext={() => {
              console.log("Next");
            }}
          />
        </div>
      </Page>
    </Card>
  );
}
