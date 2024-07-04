export default class UserRepositoryException extends Error {
  constructor(message: string) {
    super(message);
  }
}