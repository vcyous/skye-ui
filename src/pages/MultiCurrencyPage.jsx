import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  getCurrencyRateSnapshots,
  getCurrencySettings,
  updateCurrencySettings,
  upsertCurrencyRateSnapshot,
} from "../services/api.js";

const currencyOptions = [
  "USD",
  "IDR",
  "SGD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
].map((value) => ({ value, label: value }));

const roundingOptions = [
  { value: "half_up", label: "Half up" },
  { value: "up", label: "Always up" },
  { value: "down", label: "Always down" },
];

export default function MultiCurrencyPage() {
  const { activeCurrency, setCurrency, refreshLocalization } =
    useLocalization();
  const [settings, setSettings] = useState(null);
  const [rates, setRates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [settingsForm] = Form.useForm();
  const [rateForm] = Form.useForm();

  async function loadData() {
    setError("");
    setIsLoading(true);
    try {
      const currentSettings = await getCurrencySettings();
      const snapshots = await getCurrencyRateSnapshots(
        currentSettings.baseCurrency,
      );
      setSettings(currentSettings);
      setRates(snapshots);
      settingsForm.setFieldsValue({
        baseCurrency: currentSettings.baseCurrency,
        fallbackCurrency: currentSettings.fallbackCurrency,
        enabledCurrencies: currentSettings.enabledCurrencies,
        roundingPolicy: currentSettings.roundingPolicy,
      });
      rateForm.setFieldsValue({
        baseCurrency: currentSettings.baseCurrency,
        source: "manual",
        confidence: 0.95,
      });
    } catch (err) {
      setError(err.message || "Failed to load currency settings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onSaveSettings(values) {
    setError("");
    setNotice("");
    setIsSavingSettings(true);
    try {
      const updated = await updateCurrencySettings(values);
      setSettings(updated);
      await refreshLocalization();
      if (!(updated.enabledCurrencies || []).includes(activeCurrency)) {
        await setCurrency(updated.baseCurrency);
      }
      setNotice("Currency settings saved.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save currency settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function onSaveRate(values) {
    setError("");
    setNotice("");
    setIsSavingRate(true);
    try {
      await upsertCurrencyRateSnapshot(values);
      setNotice("Exchange rate snapshot saved.");
      rateForm.setFieldsValue({
        ...values,
        rate: undefined,
        quoteCurrency: undefined,
      });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save exchange rate.");
    } finally {
      setIsSavingRate(false);
    }
  }

  const columns = useMemo(
    () => [
      { title: "Base", dataIndex: "baseCurrency", key: "baseCurrency" },
      { title: "Quote", dataIndex: "quoteCurrency", key: "quoteCurrency" },
      {
        title: "Rate",
        dataIndex: "rate",
        key: "rate",
        render: (value) => Number(value || 0).toFixed(6),
      },
      {
        title: "Source",
        dataIndex: "source",
        key: "source",
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: "Confidence",
        dataIndex: "confidence",
        key: "confidence",
        render: (value) => `${Number(value || 0).toFixed(2)}`,
      },
      {
        title: "As Of",
        dataIndex: "asOf",
        key: "asOf",
      },
    ],
    [],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          Multi-currency
        </Typography.Title>
        <Typography.Text type="secondary">
          Manage conversion source rates, rounding policy, and checkout display
          currency fallback.
        </Typography.Text>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {notice ? <Alert type="success" showIcon message={notice} /> : null}

      <Card title="Currency Settings" loading={isLoading}>
        <Form form={settingsForm} layout="vertical" onFinish={onSaveSettings}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item
                name="baseCurrency"
                label="Base currency"
                rules={[{ required: true }]}
              >
                <Select options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="fallbackCurrency"
                label="Fallback currency"
                rules={[{ required: true }]}
              >
                <Select options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="enabledCurrencies"
                label="Enabled currencies"
                rules={[{ required: true }]}
              >
                <Select mode="multiple" options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="roundingPolicy"
                label="Rounding"
                rules={[{ required: true }]}
              >
                <Select options={roundingOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={isSavingSettings}>
            Save currency settings
          </Button>
        </Form>
      </Card>

      <Card title="Exchange Rate Snapshots" loading={isLoading}>
        <Form form={rateForm} layout="vertical" onFinish={onSaveRate}>
          <Row gutter={12}>
            <Col xs={24} md={4}>
              <Form.Item
                name="baseCurrency"
                label="Base"
                rules={[{ required: true }]}
              >
                <Select options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="quoteCurrency"
                label="Quote"
                rules={[{ required: true }]}
              >
                <Select options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="rate" label="Rate" rules={[{ required: true }]}>
                <InputNumber
                  min={0.000001}
                  step={0.0001}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="source"
                label="Source"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "manual", label: "manual" },
                    { value: "ecb", label: "ecb" },
                    { value: "market_feed", label: "market_feed" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="confidence"
                label="Confidence"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item label=" ">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSavingRate}
                  block
                >
                  Save rate
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Table
          rowKey="id"
          dataSource={rates}
          columns={columns}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 820 }}
          locale={{
            emptyText: "No rate snapshots found for current base currency.",
          }}
        />
      </Card>

      {settings ? (
        <Card title="Current Runtime Currency">
          <Typography.Text>
            Active UI currency: <Tag>{activeCurrency}</Tag>
          </Typography.Text>
        </Card>
      ) : null}
    </Space>
  );
}
