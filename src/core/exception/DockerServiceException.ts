import BaseException from "./BaseException";

export default class DockerServiceException extends BaseException {
    constructor(message: string, status: number) {
      super(message,status);
    }
  }