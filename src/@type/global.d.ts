export interface GenerateRequestBody {
  dirname: string;
  username: string;
  email: string;
  wpPassword: string;
  wpPort: number;
  wpHost: string;
  wpProjectName: string;
  mysqlRootPassword: string;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlPort: number;
  nameApiKey: string;
  rules: string;
  language: string;
  addons: Array<Addons>
}

export interface Addons {
  name: string;
  slug: string;
}