# Davide Mendolia Portfolio Website

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
- **Repository type**: Static HTML/CSS/JavaScript portfolio website hosted on GitHub Pages
- **No build process required**: This is a pure static site with no compilation steps
- **Test locally**: `python3 -m http.server 8000` (starts instantly)
- **Access website**: Open `http://localhost:8000` in browser
- **HTML validation**: 
  - `npm install html-validate` -- takes ~1 second (already cached after first install)
  - `npx html-validate index.html` -- takes ~0.7 seconds

### Development Workflow
- **Edit content**: Directly edit `index.html` (single-page application)
- **Test changes**: Serve locally with `python3 -m http.server 8000` (use 8080 if port is busy)
- **Validate code**: `npx html-validate index.html` (expect exactly 15 known issues)
- **Deploy**: Git push to main branch (auto-deploys via GitHub Pages)
- **Files to exclude**: Use `.gitignore` to exclude `node_modules/`, `package-lock.json`, `package.json` if they are created for validation tools

## Validation

### Manual Testing Requirements
Always manually validate any code changes by:
1. **Serve locally**: `python3 -m http.server 8000` (or 8080 if 8000 is in use)
2. **Open browser**: Navigate to `http://localhost:8000`
3. **Test navigation**: Click all navigation links (Home, About, Achievements, Case Studies, Contact)
4. **Verify smooth scrolling**: Navigation should smoothly scroll to sections - observe active state highlighting
5. **Test responsiveness**: Resize browser window to verify mobile layout (375px width works perfectly)
6. **Test animations**: Scroll down to see fade-in effects on content blocks as they come into view
7. **Verify external links**: LinkedIn and email links should work correctly
8. **Check Font Awesome icons**: Icons should load properly from CDN (expect CDN warnings in dev tools - normal)

### Known Working Validation Commands
- **HTML syntax**: `python3 -c "import html.parser; parser = html.parser.HTMLParser(); parser.feed(open('index.html').read()); print('HTML syntax appears valid')"`
- **HTML linting**: `npx html-validate index.html` (expect exactly 15 known issues: 4 "&" encoding errors and 11 trailing whitespace errors)
- **Local server test**: `curl -s -I http://localhost:8000/` should return 200 OK
- **Quick status check**: `git status && python3 -m http.server 8000 & sleep 2 && curl -s -I http://localhost:8000/ && kill %1`

## Repository Structure

### File Overview
```
davideme.dev/
├── index.html          # Main portfolio page (single-page application)
├── README.md          # Project documentation
├── CNAME              # GitHub Pages custom domain (davideme.dev)
├── .gitignore         # Excludes node_modules and dev files
└── .github/
    └── copilot-instructions.md  # This file
```

### Key Technologies
- **Frontend**: Pure HTML5, CSS3, vanilla JavaScript
- **Icons**: Font Awesome 6 (loaded from CDN)
- **Hosting**: GitHub Pages with custom domain
- **Deployment**: Automatic on push to main branch
- **No dependencies**: No build tools, webpack, or framework required

## Common Tasks

### Content Editing
- **Main content**: All content is in `index.html` as a single-page application
- **Sections**: Hero, About, Skills, Achievements, Case Studies, Contact
- **Styling**: CSS is embedded in `<style>` tags within the HTML file
- **JavaScript**: Vanilla JS for smooth scrolling and fade-in animations

### Performance and Accessibility
- **Responsive design**: Uses CSS Grid and Flexbox
- **Dark mode support**: Automatic based on user preference
- **Performance**: Optimized for fast loading (single file, minimal dependencies)
- **Accessibility**: Semantic HTML structure with proper heading hierarchy

### Deployment
- **Auto-deployment**: Push to main branch automatically deploys via GitHub Pages
- **Custom domain**: Configured via CNAME file pointing to `davideme.dev`
- **No build step**: Static files are served directly
- **HTTPS**: Automatically handled by GitHub Pages

## Troubleshooting

### Common Issues
- **Icons not loading**: Check Font Awesome CDN link in HTML head
- **Styles not applying**: Verify CSS syntax within `<style>` tags
- **Navigation not working**: Check JavaScript smooth scrolling implementation
- **Local server fails**: Ensure port 8000 is available or use different port

### Environment Requirements
- **Node.js**: v20.19.4+ available for HTML validation tools
- **Python3**: Available for local development server
- **Browser**: Modern browser with JavaScript enabled for full functionality

### Quick Status Check
```bash
# Repository status
git status

# Test local server (complete test)
python3 -m http.server 8000 &
SERVER_PID=$!
sleep 2
curl -s -I http://localhost:8000/
kill $SERVER_PID

# HTML validation (after installing html-validate)
npx html-validate index.html
```

### Performance Notes
- **All commands are fast**: Server startup is instant, validation takes <1 second
- **No timeouts needed**: This is not a build-heavy repository
- **Browser testing**: Essential for responsive design and animation validation
- **Known limitations**: Font Awesome may show CDN warnings in dev tools (normal behavior)