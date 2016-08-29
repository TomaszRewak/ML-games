var gulp = require('gulp');
var ts = require('gulp-typescript');
var browserify = require('gulp-browserify');
var clean = require('gulp-clean');
var rename = require('gulp-rename');
var sequence = require('gulp-sequence');
var less = require('gulp-less');
var banner = require('gulp-banner');

function swallowError(error) {
	console.log(error.toString())
	this.emit('end')
}

gulp.task('clear', function () {
	return gulp.src('Build').pipe(clean());
});

gulp.task('typescript', function () {
	return gulp.src('Source/Scripts/**/*.ts')
		.pipe(ts({ target: 'ES6', module: 'commonjs' }))
		.on('error', swallowError)
		.js
		.pipe(gulp.dest('Build'));
});

gulp.task('browserify', function () {
	return gulp.src('Build/Main.js')
		.pipe(browserify())
		.on('error', swallowError)
		.pipe(banner('// ******************************************** \n' +
			'// * By Tomasz Rewak (tomasz-rewak.com, linkedin.com/in/tomaszrewak) \n' + 
			'// * Copyright (c) 2016 Tomasz Rewak \n' +
			'// * Released under the The MIT License (MIT). \n' + 
			'// ******************************************** \n\n\n'
	))
		.pipe(rename('app.js'))
		.pipe(gulp.dest('Site/'));
});

gulp.task('styles', function () {
	return gulp.src('Source/Styles/*.less')
		.pipe(less())
		.on('error', swallowError)
		.pipe(gulp.dest('Site/'))
});

gulp.task('build', function (callback) {
	sequence('clear', 'typescript', 'browserify', 'clear')(callback);
});

gulp.task('watch', function () {
	gulp.watch('Source/Scripts/**/*.ts', ['build'])
	gulp.watch('Source/Styles/*.less', ['styles'])
});

gulp.task('default', ['build', 'styles']);
