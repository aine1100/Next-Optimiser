import chalk from 'chalk';
import ora from 'ora';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

class Logger {
  private static instance: Logger;
  private isVerbose: boolean = false;
  private isDebug: boolean = false;

  private constructor() {}

  public static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }

  public setVerbose(verbose: boolean) {
    this.isVerbose = verbose;
  }

  public setDebug(debug: boolean) {
    this.isDebug = debug;
  }

  public info(message: string) {
    console.log(chalk.blue('ℹ'), chalk.white(message));
  }

  public warn(message: string) {
    console.log(chalk.yellow('⚠'), chalk.yellow(message));
  }

  public error(message: string, error?: any) {
    console.error(chalk.red('✖'), chalk.red(message));
    if (error && (this.isVerbose || this.isDebug)) {
      console.error(error);
    }
  }

  public success(message: string) {
    console.log(chalk.green('✔'), chalk.green(message));
  }

  public debug(message: string) {
    if (this.isDebug) {
      console.log(chalk.gray('DEBUG:'), chalk.gray(message));
    }
  }

  public spinner(text: string) {
    return ora({
      text,
      color: 'cyan',
      spinner: 'dots',
    }).start();
  }

  public header(text: string) {
    console.log('\n' + chalk.bold.cyan(text.toUpperCase()) + '\n' + chalk.cyan('='.repeat(text.length)) + '\n');
  }

  public box(text: string) {
    const lines = text.split('\n');
    const width = Math.max(...lines.map(l => l.length)) + 4;
    const border = '═'.repeat(width);
    
    console.log(chalk.cyan(`╔${border}╗`));
    lines.forEach(line => {
      console.log(chalk.cyan('║ ') + chalk.white(line.padEnd(width - 2)) + chalk.cyan(' ║'));
    });
    console.log(chalk.cyan(`╚${border}╝`));
  }
}

export const logger = Logger.getInstance();
