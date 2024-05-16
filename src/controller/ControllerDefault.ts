import { Request, Response } from 'express'; 
import { ControllerImpl } from './ControllerInterface';

export default class ContainerController implements ControllerImpl {
  public readonly ROUTE: Array<string>;

  public constructor() {
    this.ROUTE = [
      '@GET(/index.default)'
    ];
  }

  public async default(request: Request, response: Response): Promise<void> {
    response.status(200).json({ status: 'Running' });
  }
}
