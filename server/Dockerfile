# Build Elite Insights (the open-source parser dps.report itself wraps)
# from source, targeting linux-x64 as a self-contained single-file binary
# so the final image needs no separately-installed .NET runtime.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS ei-build
WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/baaron4/GW2-Elite-Insights-Parser.git .
RUN dotnet publish GW2EIParserCLI/GW2EIParserCLI.csproj \
    -c Release -r linux-x64 --self-contained true \
    -p:PublishSingleFile=true -p:PublishTrimmed=false \
    -o /out
# The published executable's name depends on the project's AssemblyName,
# which isn't guaranteed to match the .csproj filename — detect it instead
# of hardcoding a guess. A self-contained PublishSingleFile output is one
# large extensionless executable file; nothing else in /out matches that.
RUN set -eux; \
    ls -la /out; \
    candidate=$(find /out -maxdepth 1 -type f ! -name '*.*' | head -n1); \
    if [ -z "$candidate" ]; then echo "No extensionless file found in /out (see listing above)"; exit 1; fi; \
    echo "Detected Elite Insights binary: $candidate"; \
    cp "$candidate" /out/ei-cli; \
    chmod +x /out/ei-cli

# Same base (Debian, not alpine) as the final runtime stage below — `prisma
# generate` bakes in a query-engine binary matched to the platform it runs
# on, so a mismatched build stage here fails at container startup.
FROM node:22-bookworm-slim AS node-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Debian-based (not alpine): the self-contained linux-x64 .NET build above is
# glibc-linked and needs libicu for globalization data — musl-based alpine
# would not satisfy that.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Elite Insights shares startup code with the WinForms UI app that calls
# ApplicationSettingsBase.Upgrade(), which needs HOME resolvable to compute
# a local-app-data folder — unset in a minimal container, it throws
# ArgumentNullException before parsing even starts.
ENV HOME=/root
RUN apt-get update && apt-get install -y --no-install-recommends libicu72 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /root/.local/share /root/.config

COPY --from=ei-build /out /opt/ei
COPY ei-settings.conf /opt/ei/settings.conf
RUN chmod +x /opt/ei/ei-cli

COPY --from=node-build /app/node_modules ./node_modules
COPY --from=node-build /app/dist ./dist
COPY --from=node-build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
