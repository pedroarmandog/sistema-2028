Sidebar component

This folder contains the sidebar component HTML and an injector script.

Files:
- sidebar.html: the exact sidebar HTML copied from `dashboard.html` (keeps same icons/labels/ids)
- inject-sidebar.js: script that loads `sidebar.html`, inserts it at the top of `<body>`, ensures `dashboard.css` is loaded and then loads `dashboard.js`.

Usage:
- Include the injector script in any HTML page to show the exact same menu used in Dashboard:

<script src="/frontend/sidebar-component/inject-sidebar.js" defer></script>

Notes:
- The injector uses `/frontend/dashboard.css` and `/frontend/dashboard.js` to preserve exact styling and behavior.
- If a page already has a `.sidebar` element, it will be replaced by the injected one.
- If you want me to automatically add the injector script to all HTML pages under `frontend/`, say so and I will update them.