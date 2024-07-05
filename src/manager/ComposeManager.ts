import { v2 as compose } from 'docker-compose'

export default class ComposeManager {

    public async composeUp(folderPath: string): Promise<void> {
        await compose.upAll({ cwd: folderPath, log: true });
    }
    public async composeDown(folderPath: string): Promise<void> {
      await compose.downAll({ cwd: folderPath, log: true });
    }
    public async composePull(folderPath: string): Promise<void> {
      await compose.pullAll({ cwd: folderPath, log: true });
    }

}
