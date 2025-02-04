FROM homebridge/homebridge:2024-12-19

# Remove strict plugin resolution and allow locally linked plugins to be used
RUN sed -i 's/ --strict-plugin-resolution//g' /opt/homebridge/start.sh

WORKDIR /homebridge-heatpump-plugin

# Install plugin dependencies
COPY ./homebridge-heatpump-plugin/package.json /homebridge-heatpump-plugin/package.json
COPY ./homebridge-heatpump-plugin/package-lock.json /homebridge-heatpump-plugin/package-lock.json
RUN npm install

# Build plugin
COPY ./homebridge-heatpump-plugin /homebridge-heatpump-plugin
RUN npm run build && npm link

WORKDIR /

EXPOSE 8581
CMD ["homebridge"]
