// @ts-ignore
import { useCallback, useEffect, useState } from "react";
// @ts-ignore
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Box,
  Button,
  // @ts-ignore
  Breadcrumbs,
  Divider,
  Toast,
  Frame,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

// Loader data
export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = params.id;

  const response = await admin.graphql(
    `query {
    product(id: "gid://shopify/Product/${productId}") {
      title
      description
      onlineStoreUrl
      id
      status
      vendor
      createdAt
      totalInventory
      images(first: 1) {
        edges{
          node{ url }
        }
      }
    }
  }`
  );

  const responseJson = await response.json();

  return responseJson.data.product;
};

// Action submit
export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const data = Object.fromEntries(await request.formData());
  console.log(data);

  if (data.variants && data.variants === "onClick") {
    const productId = params.id;

    const response = await admin.graphql(
      `query {
        product(id: "gid://shopify/Product/${productId}") {
          variants(first: 5) {
            edges{
              node{
                title
                price
              }
            }
          }
        }
      }`
    );

    const responseJson = await response.json();

    return json({
      variants: true,
      data: responseJson.data.product.variants.edges,
    });
  } else {
    const { id, title, descriptionHtml } = data;

    const response = await admin.graphql(
      `mutation productUpdate ($input: ProductInput!) {
        productUpdate (input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: { id, title, descriptionHtml },
        },
      }
    );
    const responseJson = await response.json();

    return json({ variants: false, data: responseJson, success: true });
  }
}

export default function Products() {
  const product = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [formProduct, setFormProduct] = useState(product);
  const [error, setError] = useState(false);
  const [contentToast, setContentToast] = useState("");
  const srcImageProduct = product.images.edges[0].node.url;

  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((active) => !active), []);

  const toastMarkup = active ? (
    <Toast content={contentToast} error={error} onDismiss={toggleActive} />
  ) : null;

  function handleSave() {
    if (actionData && actionData?.variants) {
      if (
        product.title === formProduct.title &&
        product.description === formProduct.description
      ) {
        setError(true);
        setContentToast("Data is unchanged");
        toggleActive();
        return;
      }
    } else {
      if (
        product.title === formProduct.title &&
        product.description === formProduct.description
      ) {
        setError(true);
        setContentToast("Data is unchanged");
        toggleActive();
        return;
      }
    }

    const data = {
      id: formProduct.id,
      title: formProduct.title,
      descriptionHtml: formProduct.description,
    };

    submit(data, { method: "post" });
  }

  useEffect(() => {
    if (actionData?.success) {
      setContentToast("Save success");
      setError(false);
    }
    toggleActive();
  }, [actionData?.success]);

  return (
    <Frame>
      <ui-title-bar title="Product detail" />
      <Card>
        <Page fullWidth>
          {toastMarkup}
          <div style={{ display: "flex", width: "50vw", margin: "auto" }}>
            <img
              alt=""
              width="225px"
              height="225px"
              style={{
                objectFit: "cover",
                objectPosition: "center",
                padding: "1rem",
              }}
              src={srcImageProduct}
            />
            <Box padding="5" width="100%">
              <FormLayout>
                <TextField
                  label="Product Title"
                  onChange={(title) =>
                    setFormProduct({ ...formProduct, title })
                  }
                  autoComplete="off"
                  value={formProduct.title}
                />
                <TextField
                  label="Product Description"
                  onChange={(description) =>
                    setFormProduct({ ...formProduct, description })
                  }
                  autoComplete="off"
                  value={formProduct.description}
                />
              </FormLayout>
              <div style={{ margin: "1rem 0" }}>
                <Button
                  primary={false}
                  onClick={() =>
                    submit({ variants: "onClick" }, { method: "post" })
                  }
                >
                  Show Variants
                </Button>
              </div>

              {actionData && actionData.variants && (
                <>
                  <div style={{ display: "flex", width: "100%" }}>
                    <div style={{ flexBasis: "50%" }}>Variant</div>
                    <div style={{ flexBasis: "50%" }}>Price</div>
                  </div>
                  {actionData.data.map(({ node }, key) => {
                    return (
                      <div style={{ display: "flex", width: "100%" }}>
                        <div style={{ flexBasis: "50%" }}>
                          <Divider />
                          <div style={{ margin: "1rem 0", width: "30%" }}>
                            <FormLayout>
                              <FormLayout.Group>
                                <TextField
                                  autoComplete="off"
                                  value={node.title}
                                  disabled={true}
                                />
                              </FormLayout.Group>
                            </FormLayout>
                          </div>
                        </div>
                        <div style={{ flexBasis: "50%" }}>
                          <Divider />
                          <div style={{ margin: "1rem 0" }}>
                            <FormLayout>
                              <FormLayout.Group>
                                <TextField
                                  type="number"
                                  onChange={(price) =>
                                    setFormProduct({
                                      ...formProduct,
                                      variants: { key, price },
                                    })
                                  }
                                  autoComplete="off"
                                  value={node.price}
                                />
                              </FormLayout.Group>
                            </FormLayout>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div style={{ marginTop: "1rem", textAlign: "end" }}>
                <Button primary onClick={() => handleSave()}>
                  Update Product
                </Button>
              </div>
            </Box>
          </div>
        </Page>
      </Card>
    </Frame>
  );
}
