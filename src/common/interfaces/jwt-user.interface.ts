export interface JwtUser {
  id: number;
  email: string;
  roles: string[]; // like ['driver', 'customer']
}
export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}
