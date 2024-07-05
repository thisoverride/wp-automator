import path from "path";
import { requestBodySchema } from "../../framework/validator/schema";
import DockerService from "../../service/DockerService";
import DirManager from "../../utils/DirManager";
import HttpStatusCodes from "../../utils/HttpStatusCode";
import DockerServiceException from "../exception/DockerServiceException";
import { GenerateRequestBody } from "../../@type/global";
import { Tools } from '../../utils/Utils'

export const ValidateBody = (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
  const method = descriptor.value;

  descriptor.value = async function (...args: GenerateRequestBody[]) {
      const requestBody = args[0];

      const { error } = requestBodySchema.validate(requestBody);
      if (error) {
          throw new DockerServiceException(`${error.stack}`, HttpStatusCodes.BAD_REQUEST);
      }
  
      const availablePort = await Tools.executeScript('python3',path.join('.bin/check_all_available_ports.py'));
      const portRegex: RegExp = /\d+/g;
      const matchResult: RegExpMatchArray | null = availablePort.result.match(portRegex);
      
      if (matchResult) {
        const panelPorts: number[] = matchResult.map(Number);
        if (!panelPorts.includes(parseInt(requestBody.wpPort.toString()))) {
            throw new DockerServiceException(`Le port ${requestBody.wpPort} est n'est pas disponible`, HttpStatusCodes.BAD_REQUEST);
        }
        if (!panelPorts.includes(parseInt(requestBody.mysqlPort.toString()))) {
            throw new DockerServiceException(`Le port ${requestBody.mysqlPort} est n'est pas disponible`, HttpStatusCodes.BAD_REQUEST);
        }
    } 
    
    const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, requestBody.dirname);
      if (await DirManager.folderExists(folderPath)) {
          throw new DockerServiceException(`Le projet "${requestBody.dirname}" ne peut pas être créé car il existe déjà.`, HttpStatusCodes.BAD_REQUEST);
      }

      return method.apply(this, args);
  };
}

