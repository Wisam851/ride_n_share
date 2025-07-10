export interface JwtUser {
  id: number;
  email: string;
  roles: string[]; // like ['driver', 'customer']
}
