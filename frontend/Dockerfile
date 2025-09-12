# Frontend Dockerfile

# Building React App:
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:alpine

# Copy build output to Nginx HTML folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy default nginx config and override
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]