Semester 1 practice assessments are live on Netlify (publiusnakamoto.com).

Quiz JSON lives under assets/courses/{CODE}/quizzes/ for all 15 semester-1 courses.
Catalog wiring is in assets/courses.json (testLectures).

## Full catalog

The full catalog can be restored by decoding `assets/courses.json.zlib.b64`, or by running the **Inflate courses.json** GitHub Actions workflow. When the catalog parts exist under `assets/courses/parts/`, the workflow assembles `courses.json` in order from `sem-1.json` through `sem-6.json` and `sem-other.json`.

The live Netlify site is authoritative for the deployed catalog and assessment experience.
