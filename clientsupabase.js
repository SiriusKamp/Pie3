class ClientSubapase {
  static getClient() {
    return supabase.createClient(
      "https://qorggjotigruewaiffmx.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmdnam90aWdydWV3YWlmZm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM1MDMwODcsImV4cCI6MjAzOTA3OTA4N30.YlbVI08bVrLFyvECTwU5sUh0_Xj3cSZikDI5Kg63B64"
    );
  }

  static getUser = async function () {
    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  };
}
