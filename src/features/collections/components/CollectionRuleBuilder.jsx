import { PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
} from "antd";
import {
  MATCH_MODE_OPTIONS,
  RULE_FIELD_OPTIONS,
  RULE_OPERATOR_OPTIONS,
} from "../constants";

export default function CollectionRuleBuilder({
  form,
  typeField = "collectionType",
  name = "rules",
}) {
  const collectionType = Form.useWatch(typeField, form);

  if (collectionType !== "smart") {
    return (
      <Alert
        type="info"
        showIcon
        message="Manual collection — products are added manually"
        description="After saving, use the Assign Products action to pick which products appear in this collection."
        style={{ marginTop: 8 }}
      />
    );
  }

  return (
    <Card size="small" title="Conditions" style={{ marginTop: 8 }}>
      <Form.Item
        name={[name, "match"]}
        label="Products must match"
        initialValue="all"
        rules={[{ required: true }]}
        style={{ marginBottom: 12 }}
      >
        <Select options={MATCH_MODE_OPTIONS} style={{ width: 320 }} />
      </Form.Item>

      <Form.List name={[name, "conditions"]}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: "100%" }}>
            {fields.map((field) => (
              <Row key={field.key} gutter={8} align="top">
                <Col xs={24} md={7}>
                  <Form.Item
                    name={[field.name, "field"]}
                    rules={[{ required: true, message: "Required" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select placeholder="Field" options={RULE_FIELD_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name={[field.name, "operator"]}
                    rules={[{ required: true, message: "Required" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder="Operator"
                      options={RULE_OPERATOR_OPTIONS}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={9}>
                  <Form.Item
                    name={[field.name, "value"]}
                    rules={[{ required: true, message: "Required" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Value" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={2}>
                  <Button danger onClick={() => remove(field.name)} block>
                    ✕
                  </Button>
                </Col>
              </Row>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                add({ field: "name", operator: "contains", value: "" })
              }
              type="dashed"
              style={{ marginTop: 4 }}
            >
              Add condition
            </Button>
          </Space>
        )}
      </Form.List>
    </Card>
  );
}
