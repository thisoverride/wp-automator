export interface  WordpressSitesAttributes {
  id?: number,
  app_name: string;
  url: string;
  status: string;
}
export interface  UserAttributes {
  id?: number,
  username: string;
  password: string;
  email: string;
  type: string;
  wordpress_site_id: number
}
export interface  ApiKeyAttributes {
  id?: number,
  consumer_key: string;
  consumer_secret: string;
}
