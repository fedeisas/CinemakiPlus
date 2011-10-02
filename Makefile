all:
	rm -Rf dist*
	mkdir dist
	cp *.* dist/ || true
	java -jar build/htmlcompressor-1.5.2.jar dist/popup.html -o dist/popup.html
	java -jar build/htmlcompressor-1.5.2.jar dist/options.html -o dist/options.html
	java -jar build/yuicompressor-2.4.6.jar --verbose dist/popup.css -o dist/popup.css
	java -jar build/yuicompressor-2.4.6.jar --verbose dist/popup.js -o dist/popup.js
	java -jar build/yuicompressor-2.4.6.jar --verbose dist/options.css -o dist/options.css
	java -jar build/yuicompressor-2.4.6.jar --verbose dist/bootstrap.css -o dist/bootstrap.css
	java -jar build/yuicompressor-2.4.6.jar --verbose dist/options.js -o dist/options.js