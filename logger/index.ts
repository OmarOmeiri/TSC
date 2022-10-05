import DevLogger from 'devlogger';

const logger = new DevLogger({
  levelStyles: {
    error: ['bold', 'yellow', 'bgRed'],
    info: ['bold', 'cyan', 'bgMagenta'],
    warn: ['bold', 'red', 'bgYellow'],
  },
});

export default logger;