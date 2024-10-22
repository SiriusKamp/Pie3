class ClientSubapase {
  static getClient() {
    return supabase.createClient(
      "https://tihtqlfeuprnhrndjvhg.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaHRxbGZldXBybmhybmRqdmhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3NDI5NDgsImV4cCI6MjA0MzMxODk0OH0.z_oIGDFBcLC6FBZ1bYE9jE-9QYv_BJwPxS5PoZLvCYw"
    );
  }

  static getUser = async function () {
    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  };
}
