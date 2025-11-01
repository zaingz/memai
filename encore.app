{
	"id": "memai-backend-cno2",
	"lang": "typescript",
	"exclude": ["frontend"],
	"global_cors": {
		"allow_origins_with_credentials": [
			"http://localhost:5173",
			"http://localhost:5174",
			"http://localhost:5175",
			"http://localhost:3000"
		],
		"allow_headers": [
			"Authorization",
			"Content-Type"
		],
		"allow_methods": [
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"PATCH"
		],
		"expose_headers": [
			"Content-Length"
		],
		"max_age": 7200,
		"debug": true
	}
}
