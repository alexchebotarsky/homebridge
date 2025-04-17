FROM homebridge/homebridge:2025-02-26

# Remove strict plugin resolution and allow locally linked plugins to be used
RUN sed -i 's/ --strict-plugin-resolution//g' /opt/homebridge/start.sh

WORKDIR /homebridge-plugin

# Install plugin dependencies
COPY ./homebridge-plugin/package.json /homebridge-plugin/package.json
COPY ./homebridge-plugin/package-lock.json /homebridge-plugin/package-lock.json
RUN npm install

# Build plugin
COPY ./homebridge-plugin /homebridge-plugin
RUN npm run build && npm link

WORKDIR /

EXPOSE 8581
CMD ["homebridge"]
