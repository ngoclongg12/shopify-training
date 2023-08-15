import { useCallback, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Box,
  Button,
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
      id
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
  const productId = params.id;

  if (data.variants && data.variants === "onClick") {
    // query variant when click show
    const response = await admin.graphql(
      `query {
        product(id: "gid://shopify/Product/${productId}") {
          variants(first: 5) {
            edges{
              node{
                id
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
    const { id, title, descriptionHtml, variants } = data;

    // update product by id
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
    const productResponse = await response.json();
    const variantsRender = variants !== "undefined" && JSON.parse(variants);

    if (variantsRender) {
      // update variants by id
      await variantsRender.map(async ({ id, price }) => {
        await admin.graphql(
          `mutation productVariantUpdate($input: ProductVariantInput!) {
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
          }`,
          {
            variables: {
              input: {
                id,
                price,
              },
            },
          }
        );
      });
    }

    return json({ variants: false, data: productResponse, success: true });
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
    // validate before submit
    if (actionData && actionData?.variants) {
      if (
        product.title === formProduct.title &&
        product.description === formProduct.description
      ) {
        const compareVariants = formProduct?.variants.filter(
          (variant, key) =>
            JSON.stringify(variant) !==
            JSON.stringify(actionData?.data[key].node)
        );

        if (!compareVariants.length) {
          setError(true);
          setContentToast("Data is unchanged");
          toggleActive();
          return;
        }
      } else {
        setError(false);
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
      } else {
        setError(false);
      }
    }

    const data = {
      id: formProduct.id,
      title: formProduct.title,
      descriptionHtml: formProduct.description,
      variants: JSON.stringify(formProduct?.variants),
    };

    submit(data, { method: "post" });
  }

  useEffect(() => {
    // handle toast
    if (actionData?.success && !error) {
      setFormProduct({
        ...formProduct,
        variants: null,
      });
      setContentToast("Save success");
      setError(false);
      toggleActive();
    }
  }, [actionData?.success, actionData]);

  useEffect(() => {
    if (actionData && actionData.variants) {
      let arrayVariant = [];
      actionData.data.map(({ node: { id, price, title } }) => {
        arrayVariant.push({ id, title, price });
      });

      setFormProduct({
        ...formProduct,
        variants: arrayVariant,
      });
    }
  }, [actionData]);

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

              {formProduct.variants && (
                <>
                  <div style={{ display: "flex", width: "100%" }}>
                    <div style={{ flexBasis: "50%" }}>Variant</div>
                    <div style={{ flexBasis: "50%" }}>Price</div>
                  </div>
                  {formProduct.variants.map((item, key) => {
                    return (
                      <div style={{ display: "flex", width: "100%" }}>
                        <div style={{ flexBasis: "50%" }}>
                          <Divider />
                          <div style={{ margin: "1rem 0", width: "30%" }}>
                            <FormLayout>
                              <FormLayout.Group>
                                <TextField
                                  autoComplete="off"
                                  value={item.title}
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
                                  onChange={(price) => {
                                    formProduct.variants[key].price = price;
                                    setFormProduct({
                                      ...formProduct,
                                    });
                                  }}
                                  autoComplete="off"
                                  value={formProduct.variants[key].price}
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
