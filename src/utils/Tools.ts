import { spawn, ChildProcess } from 'child_process';

type ScriptExecutionResult = {
    result: string;
    stderr: string;
};

export default class Tools {
    
    public static generateRandomString(length: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    public static executeScript(command: string, scriptPath: string, args: string[] = [],isLogged?: boolean, optionCwd?: string): Promise<ScriptExecutionResult> {
        return new Promise<ScriptExecutionResult>((resolve, reject) => {
            const scriptProcess: ChildProcess = spawn(command, [scriptPath, ...args], { cwd: optionCwd });
            let stdoutData: string = '';
            let stderrData: string = '';

            scriptProcess.stdout?.on('data', (data) => {
                const newData = data.toString();
                stdoutData += newData;
                if (isLogged) {
                    console.log(newData);
                }
            });

            scriptProcess.stderr?.on('data', (data) => {
                const newData = data.toString();
                stderrData += newData;
                if (isLogged) {
                    console.log(newData);
                }
            });

            scriptProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ result: stdoutData, stderr: stderrData });
                } else {
                    reject(new Error(`Script execution failed with code ${code}`));
                }
            });

            scriptProcess.on('error', (err) => {
                reject(new Error(`Failed to execute script: ${err.message}`));
            });
        });
    }
}