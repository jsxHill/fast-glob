import * as path from 'path';

import fg = require('fast-glob');

import * as utils from '../../utils';

const options: fg.Options = {
	cwd: path.join(process.cwd(), process.env.BENCHMARK_CWD as string),
	unique: false
};

const timeStart = utils.timeStart();

fg(['**/*', '!**/*.txt'], options)
	.then((matches) => {
		const memory = utils.getMemory();
		const time = utils.timeEnd(timeStart);
		const measures = utils.getMeasures(matches.length, time, memory);

		console.info(measures);
	})
	.catch(() => {
		process.exit(0);
	});
