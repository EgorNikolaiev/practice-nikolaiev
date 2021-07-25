const { src, dest } = require('gulp');
const gulp = require('gulp');

const connect      = require('gulp-connect'),
			fileinclude  = require("gulp-file-include"),
			del          = require("del"),
			sass         = require("gulp-sass"),
			autoprefixer = require("gulp-autoprefixer"),
			group_media  = require("gulp-group-css-media-queries"),
			clean_css    = require("gulp-clean-css"),
			rename       = require("gulp-rename"),
			terser       = require('gulp-terser'),
			babel        = require('gulp-babel'),
			imagemin     = require("gulp-imagemin"),
			webp         = require("gulp-webp"),
			ttf2woff     = require("gulp-ttf2woff"),
		  ttf2woff2    = require("gulp-ttf2woff2");

// const project_folder = require("path").basename(__dirname);
const project_folder = "_dest"
const source_folder = "_src";
const path = {
	build: {
		html: project_folder + "/",
		css: project_folder + "/css/",
		js: project_folder + "/js/",
		img: project_folder + "/images/",
		fonts: project_folder + "/fonts/"
	},
	src: {
		html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
		css: source_folder + "/scss/style.scss",
		js: [source_folder + "/js/*.js", "!" + source_folder + "/js/_*.js"],
		img: source_folder + "/images/**/*.+(png|jpg|gif|ico|svg|webp)",
		fonts: source_folder + "/fonts/*.ttf"
	}
}

const gulp_connect = () => {
	connect.server({
		root: "./" + project_folder + "/",
		livereload: true,
		port: 8888
	});
}

const html = () => {
	return src(path.src.html)
		.pipe(fileinclude())
		.pipe(dest(path.build.html))
		.pipe(connect.reload());
}

const css = () => {
	return src(path.src.css)
		.pipe(
			sass({
				outputStyle: "expanded"
			})
		)
		.pipe(group_media())
		.pipe(
			autoprefixer({
				overrideBrowserslist: [
					"last 2 version",
					"not dead",
					"not ie <= 11",
					"iOS >= 12"
				],
				cascade: true
			})
		)
		.pipe(dest(path.build.css))
		.pipe(clean_css())
		.pipe(rename({ extname: ".min.css" }))
		.pipe(dest(path.build.css))
		.pipe(dest("../theme/assets/"))
		.pipe(connect.reload());
}

const js = () => {
	return src(path.src.js)
		.pipe(fileinclude())
		// .pipe(babel({
		// 	presets: ['@babel/env']
		// }))
		.pipe(dest(path.build.js))
		.pipe(terser())
		.pipe(rename({ extname: ".min.js" }))
		.pipe(dest(path.build.js))
		.pipe(connect.reload());
}

const fonts = () => {
	src(path.src.fonts)
		.pipe(ttf2woff())
		.pipe(dest(path.build.fonts));
	return src(path.src.fonts)
		.pipe(ttf2woff2())
		.pipe(dest(path.build.fonts));
}
exports.fonts = fonts;

const images = () => {
	del(path.build.img)
	return src(path.src.img)
		.pipe(
			webp({
				quality: 75
			})
		)
		.pipe(dest(path.build.img))
		.pipe(src(path.src.img))
		.pipe(
			imagemin({
				progressive: true,
				svgoPlugins: [{ remuveViewBox: false }],
				interlaced: true,
				optimizationLavel: 3 //0 to 7
			})
		)
		.pipe(dest(path.build.img))
		.pipe(connect.reload());
}
exports.images = images;

const watch = () => {
	gulp.watch([source_folder + "/**/*.html"], gulp.series(html));
	gulp.watch([source_folder + "/scss/**/*.scss"], gulp.series(css));
	gulp.watch([source_folder + "/js/**/*.js"], gulp.series(js));
	gulp.watch([source_folder + "/images/**/*.+(png|jpg|gif|ico|svg|webp)"], gulp.series(images));
};

exports.start = gulp.series(
	gulp.parallel(
		css,
		html,
		js,
		images,
		fonts,
	),
	gulp.parallel(
		watch,
		gulp_connect,
	)
);

exports.default = gulp.series(
	gulp.parallel(
		css,
		html,
		js,
	),
	gulp.parallel(
		watch,
		gulp_connect,
	)
);