import { useLogin } from "@refinedev/core";
import { Form, Input, Button, Card, Typography } from "antd";
import { KeyOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export const Login = () => {
  const { mutate: login } = useLogin();

  const onFinish = (values: any) => {
    login(values);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "32px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Title level={2}>Newar Admin Dashboard</Title>
          <Text type="secondary">Meeting Recordings Management System</Text>
        </div>

        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            apiKey: "vxa_live_13b61b4cc600165b4a277e23106b7d7a28eade98",
            adminApiKey: "vxa_live_Je_vhFjlR4Mcs-NddEsGo3AO8L4529oNDyO276mrZEk",
          }}
        >
          <Form.Item
            label="User API Key"
            name="apiKey"
            rules={[
              { required: true, message: "User API Key é obrigatória" },
              { pattern: /^vxa_live_/, message: "API Key deve começar com vxa_live_" },
            ]}
          >
            <Input
              prefix={<KeyOutlined />}
              placeholder="vxa_live_..."
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Admin API Key"
            name="adminApiKey"
            rules={[{ required: true, message: "Admin API Key é obrigatória" }]}
          >
            <Input
              prefix={<KeyOutlined />}
              placeholder="Admin API Key"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              style={{ marginTop: "16px" }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            As chaves já estão pré-preenchidas para desenvolvimento.
            <br />
            Clique em "Sign In" para entrar.
          </Text>
        </div>
      </Card>
    </div>
  );
};
