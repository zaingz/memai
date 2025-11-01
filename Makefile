.PHONY: help deploy-backend deploy-frontend deploy-all clean install dev-backend test typecheck logs db-shell

# Default target - show help
help:
	@echo "MemAI Backend - Available Make Targets"
	@echo "======================================="
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-backend    - Deploy backend to Encore Cloud"
	@echo "  make deploy-frontend   - Deploy frontend to Vercel (production)"
	@echo "  make deploy-all        - Deploy both backend and frontend"
	@echo ""
	@echo "Development:"
	@echo "  make dev-backend       - Run backend locally (encore run)"
	@echo "  make install           - Install dependencies"
	@echo "  make clean             - Clean build artifacts and temporary files"
	@echo ""
	@echo "Testing & Validation:"
	@echo "  make test              - Run tests (encore test)"
	@echo "  make typecheck         - Check TypeScript types"
	@echo ""
	@echo "Operations:"
	@echo "  make logs              - View staging logs"
	@echo "  make db-shell          - Open database shell for bookmarks service"
	@echo ""

# Deploy backend to Encore Cloud
deploy-backend:
	@echo "Deploying backend to Encore Cloud..."
	git push encore main

# Deploy frontend to Vercel (production)
deploy-frontend:
	@echo "Deploying frontend to Vercel..."
	cd frontend && vercel --prod

# Deploy both backend and frontend
deploy-all:
	@echo "Deploying backend and frontend..."
	@$(MAKE) deploy-backend
	@$(MAKE) deploy-frontend

# Clean build artifacts and temporary files
clean:
	@echo "Cleaning build artifacts..."
	rm -rf .encore/
	rm -rf encore.gen/
	rm -rf node_modules/
	rm -rf tsconfig.tsbuildinfo
	@echo "Clean complete!"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Run backend locally
dev-backend:
	@echo "Starting Encore backend locally..."
	encore run

# Run tests
test:
	@echo "Running tests..."
	encore test

# Check TypeScript types
typecheck:
	@echo "Checking TypeScript types..."
	npx tsc --noEmit

# View staging logs
logs:
	@echo "Viewing staging logs..."
	encore logs --env=staging

# Open database shell
db-shell:
	@echo "Opening database shell for bookmarks service..."
	encore db shell bookmarks
