import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const RecordingCreate = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Platform"
          name="platform"
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="google_meet">Google Meet</Select.Option>
            <Select.Option value="teams">Microsoft Teams</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Meeting ID"
          name="meeting_id"
          rules={[{ required: true, min: 3 }]}
          extra="For Google Meet: abc-defg-hij from meet.google.com/abc-defg-hij"
        >
          <Input placeholder="abc-defg-hij" />
        </Form.Item>
        <Form.Item
          label="Bot Name"
          name="bot_name"
          extra="Optional: Custom name for the recording bot"
        >
          <Input placeholder="Newar Bot" />
        </Form.Item>
      </Form>
    </Create>
  );
};
