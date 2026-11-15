const config = { host: "x", port: 80 };
type Keys = keyof typeof config;
function read(k: Keys) {}
read("port");
read("user");
