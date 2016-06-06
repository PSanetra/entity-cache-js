var gulp = require('gulp');
var ts = require('gulp-typescript');
var jasmine = require('gulp-jasmine');
var merge = require('merge2');
var clean = require('gulp-clean');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('clean', ()=> {
  var tsResult = gulp.src(['dist/prod'])
    .pipe(clean());
});

gulp.task('build', ['clean'], ()=> {
  var tsResult = gulp.src(['src/**/*.ts', '!src/**/*.spec.ts'])
    .pipe(ts(tsProject));

  return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
    tsResult.dts.pipe(gulp.dest('dist/prod')),
    tsResult.js.pipe(gulp.dest('dist/prod'))
  ]);
});

gulp.task('clean.dev', ()=> {
  var tsResult = gulp.src(['dist/dev'])
    .pipe(clean());
});

gulp.task('build.dev', ['clean.dev'], ()=> {
  var tsResult = gulp.src(['src/**/*.ts', '!src/**/*.spec.ts'])
    .pipe(ts(tsProject));

return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
  tsResult.dts.pipe(gulp.dest('dist/dev')),
  tsResult.js.pipe(gulp.dest('dist/dev'))
]);
});

gulp.task('build.test', ['build.dev'], ()=> {
  var tsResult = gulp.src(['src/**/*.spec.ts'])
    .pipe(ts(tsProject));

return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
  tsResult.dts.pipe(gulp.dest('dist/dev')),
  tsResult.js.pipe(gulp.dest('dist/dev'))
]);
});

gulp.task('test', ['build.test'], function() {
  return gulp.src(['dist/**/*.spec.js'])
    .pipe(jasmine());
});
