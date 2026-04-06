import chalk from 'chalk';
import ora from 'ora';
class Logger {
    static instance;
    isVerbose = false;
    isDebug = false;
    constructor() { }
    static getInstance() {
        if (!this.instance) {
            this.instance = new Logger();
        }
        return this.instance;
    }
    setVerbose(verbose) {
        this.isVerbose = verbose;
    }
    setDebug(debug) {
        this.isDebug = debug;
    }
    info(message) {
        console.log(chalk.blue('ℹ'), chalk.white(message));
    }
    warn(message) {
        console.log(chalk.yellow('⚠'), chalk.yellow(message));
    }
    error(message, error) {
        console.error(chalk.red('✖'), chalk.red(message));
        if (error && (this.isVerbose || this.isDebug)) {
            console.error(error);
        }
    }
    success(message) {
        console.log(chalk.green('✔'), chalk.green(message));
    }
    debug(message) {
        if (this.isDebug) {
            console.log(chalk.gray('DEBUG:'), chalk.gray(message));
        }
    }
    spinner(text) {
        return ora({
            text,
            color: 'cyan',
            spinner: 'dots',
        }).start();
    }
    header(text) {
        console.log('\n' + chalk.bold.cyan(text.toUpperCase()) + '\n' + chalk.cyan('='.repeat(text.length)) + '\n');
    }
    box(text) {
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
