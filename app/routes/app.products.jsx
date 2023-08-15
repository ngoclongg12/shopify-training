import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
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
import { QUERY_PRODUCTS_FIRST, QUERY_PRODUCTS_LAST } from "~/query";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(QUERY_PRODUCTS_FIRST, {
    variables: {
      first: 5,
      cursor: null,
    },
  });

  const responseJson = await response.json();

  return responseJson.data.products;
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const { cursor, action } = Object.fromEntries(await request.formData());

  const response =
    action === "next"
      ? await admin.graphql(QUERY_PRODUCTS_FIRST, {
          variables: {
            first: 5,
            cursor,
          },
        })
      : await admin.graphql(QUERY_PRODUCTS_LAST, {
          variables: {
            last: 5,
            cursor,
          },
        });

  const responseJson = await response.json();

  return responseJson.data.products;
}

export default function Products() {
  const { nodes: productsLoader, edges: edgesLoader } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [products, setProducts] = useState(productsLoader);
  const [edges, setEdges] = useState(edgesLoader);

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
            url={`/app/product/${id.replace("gid://shopify/Product/", "")}`}
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

  useEffect(() => {

    // handle data for pagination
    if (actionData && actionData?.edges.length) {
      setEdges(actionData?.edges);
      setProducts(actionData?.nodes);
    } else {
      setEdges(edgesLoader);
      setProducts(productsLoader);
    }
  }, [actionData]);

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
              submit(
                { action: "prev", cursor: edges[0].cursor },
                { method: "post" }
              );
            }}
            hasNext
            onNext={() => {
              submit(
                { action: "next", cursor: edges.slice(-1)[0].cursor },
                { method: "post" }
              );
            }}
          />
        </div>
      </Page>
    </Card>
  );
}
