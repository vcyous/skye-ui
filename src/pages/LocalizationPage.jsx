import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
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
  deleteLocalizationTranslation,
  getLocalizationMissingTranslations,
  getLocalizationSettings,
  getLocalizationTranslations,
  updateLocalizationSettings,
  upsertLocalizationTranslation,
} from "../services/api.js";

const localeOptions = [
  { value: "id", label: "Indonesian (id)" },
  { value: "en", label: "English (en)" },
  { value: "ms", label: "Malay (ms)" },
  { value: "fr", label: "French (fr)" },
  { value: "de", label: "German (de)" },
  { value: "es", label: "Spanish (es)" },
  { value: "pt-BR", label: "Portuguese (pt-BR)" },
];

export default function LocalizationPage() {
  const { t, refreshLocalization } = useLocalization();
  const [rows, setRows] = useState([]);
  const [missingKeys, setMissingKeys] = useState([]);
  const [localeFilter, setLocaleFilter] = useState("id");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingTranslation, setEditingTranslation] = useState(null);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);

  const [settingsForm] = Form.useForm();
  const [translationForm] = Form.useForm();

  async function loadData(nextLocale = localeFilter) {
    setError("");
    setIsLoading(true);
    try {
      const currentSettings = await getLocalizationSettings();
      const [translations, missing] = await Promise.all([
        getLocalizationTranslations({ locale: nextLocale, namespace: "admin" }),
        getLocalizationMissingTranslations({
          locale: nextLocale,
          baseLocale: currentSettings.fallbackLocale || "en",
          namespace: "admin",
        }),
      ]);

      settingsForm.setFieldsValue({
        defaultLocale: currentSettings.defaultLocale,
        fallbackLocale: currentSettings.fallbackLocale,
        enabledLocales: currentSettings.enabledLocales,
      });
      setRows(translations);
      setMissingKeys(missing);
    } catch (err) {
      setError(err.message || "Failed to load localization settings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [localeFilter]);

  async function onSaveSettings(values) {
    setError("");
    setNotice("");
    setIsSavingSettings(true);
    try {
      await updateLocalizationSettings(values);
      await refreshLocalization();
      setNotice("Localization settings saved.");
      await loadData(localeFilter);
    } catch (err) {
      setError(err.message || "Failed to save localization settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  function openTranslationModal(record = null) {
    setEditingTranslation(record);
    translationForm.resetFields();
    translationForm.setFieldsValue({
      locale: record?.locale || localeFilter,
      namespace: record?.namespace || "admin",
      translationKey: record?.translationKey || "",
      translationValue: record?.translationValue || "",
    });
    setIsTranslationModalOpen(true);
  }

  async function onSaveTranslation(values) {
    setError("");
    setNotice("");
    setIsSavingTranslation(true);
    try {
      await upsertLocalizationTranslation(values);
      setNotice("Translation saved.");
      setEditingTranslation(null);
      setIsTranslationModalOpen(false);
      translationForm.resetFields();
      await loadData(localeFilter);
    } catch (err) {
      setError(err.message || "Failed to save translation.");
    } finally {
      setIsSavingTranslation(false);
    }
  }

  async function onDeleteTranslation(record) {
    setError("");
    setNotice("");
    try {
      await deleteLocalizationTranslation(record.id);
      setNotice("Translation deleted.");
      await loadData(localeFilter);
    } catch (err) {
      setError(err.message || "Failed to delete translation.");
    }
  }

  const translationColumns = useMemo(
    () => [
      {
        title: "Key",
        dataIndex: "translationKey",
        key: "translationKey",
      },
      {
        title: "Value",
        dataIndex: "translationValue",
        key: "translationValue",
      },
      {
        title: "Locale",
        dataIndex: "locale",
        key: "locale",
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => openTranslationModal(record)}>
              Edit
            </Button>
            <Popconfirm
              title="Delete this translation?"
              onConfirm={() => onDeleteTranslation(record)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          {t("localization.title", "Localization")}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t(
            "localization.subtitle",
            "Manage languages, fallback strategy, and translation coverage.",
          )}
        </Typography.Text>
      </div>

      {error ? <Alert type="error" message={error} showIcon /> : null}
      {notice ? <Alert type="success" message={notice} showIcon /> : null}

      <Card title="Language Settings" loading={isLoading}>
        <Form form={settingsForm} layout="vertical" onFinish={onSaveSettings}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="defaultLocale"
                label="Default locale"
                rules={[{ required: true }]}
              >
                <Select options={localeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="fallbackLocale"
                label="Fallback locale"
                rules={[{ required: true }]}
              >
                <Select options={localeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="enabledLocales"
                label="Enabled locales"
                rules={[{ required: true }]}
              >
                <Select mode="multiple" options={localeOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={isSavingSettings}>
            Save localization settings
          </Button>
        </Form>
      </Card>

      <Card
        title="Translation Management"
        extra={
          <Space>
            <Select
              value={localeFilter}
              options={localeOptions}
              onChange={setLocaleFilter}
              style={{ minWidth: 180 }}
            />
            <Button type="primary" onClick={() => openTranslationModal()}>
              Add translation
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={rows}
          columns={translationColumns}
          loading={isLoading}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 820 }}
        />
      </Card>

      <Card title="Missing Translation Keys" loading={isLoading}>
        {!missingKeys.length ? (
          <Typography.Text type="secondary">
            No missing keys detected for {localeFilter}.
          </Typography.Text>
        ) : (
          <Space wrap>
            {missingKeys.map((key) => (
              <Tag key={key} color="gold">
                {key}
              </Tag>
            ))}
          </Space>
        )}
      </Card>

      <Modal
        title={editingTranslation ? "Edit translation" : "Add translation"}
        open={isTranslationModalOpen}
        onCancel={() => {
          setEditingTranslation(null);
          setIsTranslationModalOpen(false);
          translationForm.resetFields();
        }}
        onOk={() => translationForm.submit()}
        confirmLoading={isSavingTranslation}
      >
        <Form
          form={translationForm}
          layout="vertical"
          onFinish={onSaveTranslation}
        >
          <Form.Item name="locale" label="Locale" rules={[{ required: true }]}>
            <Select options={localeOptions} />
          </Form.Item>
          <Form.Item
            name="namespace"
            label="Namespace"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="translationKey"
            label="Key"
            rules={[{ required: true }]}
          >
            <Input placeholder="app.workspace" />
          </Form.Item>
          <Form.Item
            name="translationValue"
            label="Value"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
