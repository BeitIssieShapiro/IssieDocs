# Maestro flows (smoke e2e)

The full e2e suite is Detox (`e2e/`). These Maestro flows are a lighter smoke check that
runs on any installed build (no Detox test build):

    maestro test .maestro/                                       # iOS, com.issieshapiro.issiedoc.IssieDoc
    maestro test -e APP_ID=org.issieshapiro.issiedocs .maestro/  # Android

`add-page-to-worksheet.yaml` was in e2e/ before; it keeps real user data (no clearState).
