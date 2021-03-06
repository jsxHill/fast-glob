import micromatch = require('micromatch');

import * as pathUtils from '../../utils/path';
import * as patternUtils from '../../utils/pattern';

import { IOptions } from '../../managers/options';

import { FilterFunction } from '@mrmlnc/readdir-enhanced';
import { Entry } from '../../types/entries';
import { Pattern, PatternRe } from '../../types/patterns';

export default class EntryFilter {
	public readonly index: Map<string, undefined> = new Map();

	constructor(private readonly options: IOptions, private readonly micromatchOptions: micromatch.Options) { }

	/**
	 * Returns filter for directories.
	 */
	public getFilter(positive: Pattern[], negative: Pattern[]): FilterFunction {
		const positiveRe: PatternRe[] = patternUtils.convertPatternsToRe(positive, this.micromatchOptions);
		const negativeRe: PatternRe[] = patternUtils.convertPatternsToRe(negative, this.micromatchOptions);

		return (entry: Entry) => this.filter(entry, positiveRe, negativeRe);
	}

	/**
	 * Returns true if entry must be added to result.
	 */
	private filter(entry: Entry, positiveRe: PatternRe[], negativeRe: PatternRe[]): boolean {
		// Exclude duplicate results
		if (this.options.unique) {
			if (this.isDuplicateEntry(entry)) {
				return false;
			}

			this.createIndexRecord(entry);
		}

		// Filter files and directories by options
		if (this.onlyFileFilter(entry) || this.onlyDirectoryFilter(entry)) {
			return false;
		}

		if (this.isSkippedByAbsoluteNegativePatterns(entry, negativeRe)) {
			return false;
		}

		return this.isMatchToPatterns(entry.path, positiveRe) && !this.isMatchToPatterns(entry.path, negativeRe);
	}

	/**
	 * Return true if the entry already has in the cross reader index.
	 */
	private isDuplicateEntry(entry: Entry): boolean {
		return this.index.has(entry.path);
	}

	/**
	 * Create record in the cross reader index.
	 */
	private createIndexRecord(entry: Entry): void {
		this.index.set(entry.path, undefined);
	}

	/**
	 * Returns true for non-files if the «onlyFiles» option is enabled.
	 */
	private onlyFileFilter(entry: Entry): boolean {
		return this.options.onlyFiles && !entry.isFile();
	}

	/**
	 * Returns true for non-directories if the «onlyDirectories» option is enabled.
	 */
	private onlyDirectoryFilter(entry: Entry): boolean {
		return this.options.onlyDirectories && !entry.isDirectory();
	}

	/**
	 * Return true when `absolute` option is enabled and matched to the negative patterns.
	 */
	private isSkippedByAbsoluteNegativePatterns(entry: Entry, negativeRe: PatternRe[]): boolean {
		if (!this.options.absolute) {
			return false;
		}

		const fullpath = pathUtils.makeAbsolute(this.options.cwd, entry.path);

		return this.isMatchToPatterns(fullpath, negativeRe);
	}

	/**
	 * Return true when entry match to provided patterns.
	 *
	 * First, just trying to apply patterns to the path.
	 * Second, trying to apply patterns to the path with final slash (need to micromatch to support «directory/**» patterns).
	 */
	private isMatchToPatterns(filepath: string, patternsRe: PatternRe[]): boolean {
		return patternUtils.matchAny(filepath, patternsRe) || patternUtils.matchAny(filepath + '/', patternsRe);
	}
}
