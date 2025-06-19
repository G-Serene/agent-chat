# Production Deployment Checklist

## Pre-Deployment Checklist

### Environment Variables ✓
- [ ] `NODE_ENV=production`
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] `NEXTAUTH_SECRET` set to secure random string (min 32 characters)
- [ ] `AUTH_AZURE_AD_CLIENT_ID` from Azure App Registration
- [ ] `AUTH_AZURE_AD_CLIENT_SECRET` from Azure App Registration
- [ ] `AUTH_AZURE_AD_TENANT_ID` set to your tenant ID or "common"

### Azure App Registration Configuration ✓
- [ ] App registration created in Azure Portal
- [ ] Redirect URI configured: `https://yourdomain.com/api/auth/callback/azure-ad`
- [ ] API permissions granted:
  - [ ] Microsoft Graph > User.Read
  - [ ] Microsoft Graph > profile
  - [ ] Microsoft Graph > email
  - [ ] Microsoft Graph > openid
- [ ] Client secret created and saved securely
- [ ] Application ID (Client ID) noted

### Security Configuration ✓
- [ ] HTTPS enabled in production
- [ ] Secure cookie settings configured
- [ ] CSRF protection enabled (built into NextAuth)
- [ ] Session timeout configured appropriately
- [ ] Environment variables secured (not in source control)

### Testing Checklist ✓
- [ ] Authentication flow works in staging
- [ ] User can sign in with Azure account
- [ ] User can sign out properly
- [ ] Session persists across page refreshes
- [ ] Protected routes require authentication
- [ ] Error handling works for auth failures
- [ ] User information displays correctly

### Monitoring & Logging ✓
- [ ] Authentication errors are logged
- [ ] Session analytics configured
- [ ] Failed login attempts monitored
- [ ] Performance metrics tracked

## Post-Deployment Verification

### Functional Tests ✓
1. Visit `/auth/signin` - should show Azure sign-in
2. Complete sign-in flow - should redirect to main app
3. Visit `/auth/status` - should show user information
4. Sign out - should return to sign-in page
5. Try accessing protected route while signed out - should redirect to sign-in

### Security Tests ✓
1. Verify HTTPS is enforced
2. Check session cookies are secure
3. Confirm JWT tokens are properly signed
4. Test session expiration
5. Verify CSRF protection

## Rollback Plan

If issues are encountered:
1. Set `NODE_ENV=development` to disable SSO temporarily
2. Verify application still functions in development mode
3. Fix configuration issues
4. Re-deploy with corrected settings

## Support Information

### Documentation Links
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Azure AD Provider](https://next-auth.js.org/providers/azure-ad)
- [Azure App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

### Common Issues
1. **Redirect URI Mismatch**: Ensure Azure App Registration redirect URI matches deployment URL
2. **Tenant Restriction**: Check if `tenantId` is correctly set for organization-only access
3. **Permission Issues**: Verify all required API permissions are granted and admin consent given
4. **Environment Variables**: Double-check all required variables are set correctly

### Emergency Contacts
- DevOps Team: [contact info]
- Azure Administrator: [contact info]
- Security Team: [contact info]
