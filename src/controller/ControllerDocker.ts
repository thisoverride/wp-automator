import { Request, Response } from 'express'; 
import { Controller } from './ControllerInterface';
import DockerService from '../service/DockerService';

export default class DockerController implements Controller {
  public readonly ROUTE: Array<string>;
  private readonly _dockerService: DockerService;

  public constructor(dockerService :DockerService) {
    console.log(dockerService)
    this._dockerService = dockerService;
    this.ROUTE = [
      '@POST(/generate-docker,generate)'
    ];
  }

  public async generate(request: Request, response: Response): Promise<void> {
    try {
      const res = await this._dockerService.generateDocker(request);
      response.status(200).json({ response : res });
    } catch (error: any) {
      response.status(400).json({ error: error.message });
    }
  }
}
